export type FlowTarget = {
  id: string;
  label: string;
  value: number;
  color: string;
};

export const FLOW_TARGETS: FlowTarget[] = [
  {
    id: "non_drought_year_guiding_principle",
    label: "Non-drought year guiding principle",
    value: 100,
    color: "#16a34a",
  },
  {
    id: "drought_year_guiding_principle",
    label: "Drought year guiding principle",
    value: 60,
    color: "#ea580c",
  },
  {
    id: "historic_low",
    label: "Historic Channel Low Flow",
    value: 20,
    color: "#dc2626",
  },
];

export const LONG_TERM_GOAL_CFS = 250;
