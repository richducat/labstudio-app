export const LAB_LOCATION = '3280 Suntree Blvd, Melbourne, FL';

export type LabBookableService = {
  id: string;
  name: string;
  price: number;
  time: string;
  desc: string;
  type: string;
};

export type LabTimeGroup = {
  label: string;
  slots: string[];
};

export const LAB_SERVICES: LabBookableService[] = [
  {
    id: 'intro',
    name: 'Intro Assessment',
    price: 49,
    time: '45m',
    desc: 'Movement screen, baseline review, and training strategy.',
    type: 'Strategy',
  },
  {
    id: 'pt60',
    name: '1:1 Training Session',
    price: 95,
    time: '60m',
    desc: 'A guided strength or hypertrophy session built around your goals.',
    type: 'Strength',
  },
  {
    id: 'recovery',
    name: 'Recovery Session',
    price: 59,
    time: '30m',
    desc: 'Contrast therapy focused on recovery and down-regulation.',
    type: 'Recovery',
  },
  {
    id: 'mobility',
    name: 'Mobility Session',
    price: 55,
    time: '45m',
    desc: 'Active mobility work for joint health and movement quality.',
    type: 'Mobility',
  },
];

export const LAB_TIME_GROUPS: LabTimeGroup[] = [
  { label: 'Morning', slots: ['6:00 AM', '7:30 AM', '9:00 AM'] },
  { label: 'Evening', slots: ['4:30 PM', '6:00 PM', '7:30 PM'] },
];
