"""Refresh the bundled Icicle overview. Run with scripts/area-data-requirements.txt.
Only public source data is requested. No credentials or runtime app services needed.
"""
import calendar
import hashlib
import json
import math
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import subprocess
from urllib.parse import urlencode
from pyproj import Transformer
from shapely.geometry import shape, box
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data/sources'
CACHE = Path('/tmp/icicle-climate-cache')
WSIO = 'https://gispub.epa.gov/arcgis/rest/services/r4/wsio/MapServer'
HUC = '1702001104'
LAND = {'Forest': 'FOREST_PCT_HUC12', 'Shrub / scrub': 'SHRUB_PCT_HUC12', 'Developed land': 'URBAN_PCT_HUC12', 'Open water': 'OPENWATER_PCT_HUC12', 'Grassland': 'GRASSLAND_PCT_HUC12', 'Wetlands': 'WETLANDS_PCT_HUC12', 'Barren land': 'BARREN_PCT_HUC12'}
SOIL = {'Group A · high infiltration': 'SOIL_RUNOFF_LOW_PCT_HUC12', 'Group B · moderate infiltration': 'SOIL_RUNOFF_MODLOW_PCT_HUC12', 'Group C · slow infiltration': 'SOIL_RUNOFF_MODHIGH_PCT_HUC12', 'Group D · very slow infiltration': 'SOIL_RUNOFF_HIGH_PCT_HUC12'}
TERRAIN = ['ELEVATION_MIN_HUC12', 'ELEVATION_MAX_HUC12', 'ELEVATION_MEAN_HUC12', 'SLOPE_MEAN_HUC12']
FIELDS = ['HUC12_TEXT', 'NAME_HUC12', 'AREA_HUC12', *LAND.values(), *SOIL.values(), *TERRAIN]


def get(url, params):
    url = url + '?' + urlencode(params)
    result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--retry', '3', '--retry-delay', '20', '--retry-all-errors', '--max-time', '180', url], check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    if 'error' in data:
        raise ValueError(data)
    return data, url


def weighted_mean(rows, key):
    # Missing source values must never silently become zero or change denominator.
    values = [row[key] for row in rows]
    if any(not isinstance(v, (int, float)) or not math.isfinite(v) for v in values):
        raise ValueError(f'Incomplete source coverage: {key}')
    return sum(row[key] * row['AREA_HUC12'] for row in rows) / sum(row['AREA_HUC12'] for row in rows)


def monthly_summary(daily):
    dates = daily['time']
    start, end = date(1991, 1, 1), date(2020, 12, 31)
    expected = [(start + timedelta(days=i)).isoformat() for i in range((end-start).days+1)]
    if dates != expected:
        raise ValueError('Incomplete climate date coverage')
    temp, precip = daily['temperature_2m_mean'], daily['precipitation_sum']
    if len(temp) != len(dates) or len(precip) != len(dates):
        raise ValueError('Climate array lengths differ')
    if any(v is None or not math.isfinite(v) for v in temp + precip) or any(v < 0 for v in precip):
        raise ValueError('Missing or invalid climate values')
    monthly = []
    for month in range(1, 13):
        # Average each year's monthly mean equally; sum daily precipitation first.
        yearly = []
        for year in range(1991, 2021):
            ix = [i for i, day in enumerate(dates) if day.startswith(f'{year}-{month:02d}')]
            yearly.append((sum(temp[i] for i in ix)/len(ix), sum(precip[i] for i in ix)))
        monthly.append({'month': calendar.month_abbr[month], 'temperatureC': sum(t for t,p in yearly)/30, 'precipitationMm': sum(p for t,p in yearly)/30})
    return monthly


def main():
    OUT.mkdir(exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    source = json.loads((ROOT / 'src/data/sources/icicle-area-source.json').read_text())
    rows, boundary, definitions = source['metrics'], source['subwatersheds'], source['definitions']
    data_url = f'{WSIO}/1/query?HUC12_TEXT%20LIKE%20{HUC}'
    boundary_url = f'{WSIO}/0/query?HUC12_TEXT%20LIKE%20{HUC}'
    metadata_url = f'{WSIO}/2/query?indicator%20definitions'
    assert sorted(row['HUC12_TEXT'] for row in rows) == [HUC + f'{i:02d}' for i in range(1,7)]
    assert len(boundary['features']) == 6
    basin = unary_union([shape(f['geometry']) for f in boundary['features']])
    assert basin.is_valid
    project = Transformer.from_crs('EPSG:4326','EPSG:5070', always_xy=True).transform
    area_m2 = sum(row['AREA_HUC12'] for row in rows)
    projected_area = transform(project, basin).area
    assert abs(projected_area / area_m2 - 1) < .02
    west, south, east, north = basin.bounds
    cells=[]
    # ERA5 grid centres at multiples of 0.25 degrees. Clip each cell to basin.
    for x in range(math.floor(west*4), math.ceil(east*4)+1):
        for y in range(math.floor(south*4), math.ceil(north*4)+1):
            lon,lat=x/4,y/4
            overlap=basin.intersection(box(lon-.125,lat-.125,lon+.125,lat+.125))
            if overlap.is_empty or overlap.area == 0:
                continue
            cells.append({'latitude':lat,'longitude':lon,'areaM2':transform(project,overlap).area})
    cell_area=sum(c['areaM2'] for c in cells)
    assert abs(cell_area/projected_area-1)<.001
    for i,cell in enumerate(cells):
        cell['weight']=cell['areaM2']/cell_area
        params={'latitude':cell['latitude'],'longitude':cell['longitude'],'start_date':'1991-01-01','end_date':'2020-12-31','daily':'temperature_2m_mean,precipitation_sum','models':'era5','timezone':'America/Los_Angeles','elevation':'nan','cell_selection':'nearest'}
        path=CACHE/f"era5_{cell['latitude']}_{cell['longitude']}.json"
        if path.exists():
            record=json.loads(path.read_text())
        else:
            response,url=get('https://archive-api.open-meteo.com/v1/archive',params)
            assert abs(response['latitude']-cell['latitude'])<.001 and abs(response['longitude']-cell['longitude'])<.001
            assert response['daily_units']['temperature_2m_mean']=='°C' and response['daily_units']['precipitation_sum']=='mm'
            record={'url':url,'sha256':hashlib.sha256(json.dumps(response,sort_keys=True).encode()).hexdigest(),'months':monthly_summary(response['daily'])}
            path.write_text(json.dumps(record))
        cell.update(record)
        print(f'Climate grid cell {i+1}/{len(cells)}',flush=True)
    months=[{'month':calendar.month_abbr[m+1], 'temperatureF':sum(c['months'][m]['temperatureC']*c['weight'] for c in cells)*9/5+32, 'precipitationIn':sum(c['months'][m]['precipitationMm']*c['weight'] for c in cells)/25.4} for m in range(12)]
    land=[{'label':label,'value':weighted_mean(rows,key),'unit':'%'} for label,key in LAND.items()]
    land.append({'label':'Other land cover','value':100-sum(m['value'] for m in land),'unit':'%'})
    soil=[{'label':label,'value':weighted_mean(rows,key),'unit':'%'} for label,key in SOIL.items()]
    soil.append({'label':'Not represented in A–D','value':100-sum(m['value'] for m in soil),'unit':'%'})
    assert all(0 <= m['value'] <=100 for m in land+soil)
    result={'retrievedAt':datetime.now(timezone.utc).isoformat(),'huc10':HUC,'areaKm2':area_m2/1e6,'subwatersheds':[{'id':r['HUC12_TEXT'],'name':r['NAME_HUC12']} for r in rows], 'land':land,'soil':soil,'terrain':[{'label':'Minimum elevation','value':min(r[TERRAIN[0]] for r in rows),'unit':'ft'},{'label':'Maximum elevation','value':max(r[TERRAIN[1]] for r in rows),'unit':'ft'},{'label':'Mean elevation','value':weighted_mean(rows,TERRAIN[2]),'unit':'ft'},{'label':'Average slope','value':weighted_mean(rows,TERRAIN[3]),'unit':'°'}], 'climate':{'months':months,'cellCount':len(cells),'annualPrecipitationIn':sum(m['precipitationIn'] for m in months),'meanTemperatureF':sum(m['temperatureF']*sum(calendar.monthrange(y,i+1)[1] for y in range(1991,2021)) for i,m in enumerate(months))/10958}}
    (OUT/'icicle-area-summary.json').write_text(json.dumps(result,indent=2)+'\n')
    (OUT/'icicle-area-provenance.json').write_text(json.dumps({'retrievedAt':result['retrievedAt'],'urls':{'metrics':data_url,'boundaries':boundary_url,'definitions':metadata_url,'metadataNote':'EPA WSIO source values and boundary geometries are bundled in icicle-area-source.json for reproducible offline aggregation.'},'rows':rows,'definitions':definitions,'climateCells':cells},indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__ == '__main__':
    main()
