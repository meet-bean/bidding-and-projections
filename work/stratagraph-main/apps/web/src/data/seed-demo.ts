import type { ProjectionProject } from '@repo/projections';
import { makeLineKey, loadProject, createRegistry, addServiceItem } from '@repo/projections';
import type { Bid, Invoice } from '~/lib/types';

const s = (qty: number, hours: number, cost: number) => ({
  qty, hours,
  upm: hours > 0 ? qty / hours : 0,
  mpu: qty > 0 ? hours / qty : 0,
  uc: qty > 0 ? cost / qty : 0,
  cost,
});
const z = () => s(0, 0, 0);

// ---------------------------------------------------------------------------
// Project 1: Suncoast Phase 3A — Juan P. Cardenas (from real spreadsheet)
// Contract 25807, Florida's Turnpike Enterprise, $206M revenue
// 6 monthly versions (Sep 2025 – Mar 2026)
// ---------------------------------------------------------------------------

const SUNCOAST_3A: Partial<ProjectionProject> = {
  id: 'demo-suncoast-3a',
  name: 'Suncoast Phase 3A',
  jobNumber: '25807',
  customer: "Florida's Turnpike Enterprise",
  pm: 'Juan P. Cardenas',
  createdAt: '2025-09-01T00:00:00.000Z',
  draft: null,
  comments: {
    [makeLineKey('B-100-', '2Labor')]: [
      { id: 'dc1', author: 'Juan P. Cardenas', text: 'MOT crew staffing stable. Adding weekend shifts starting November to maintain schedule.', createdAt: '2025-10-20T10:00:00Z', versionLabel: 'October 2025 Projection' },
      { id: 'dc2', author: 'Juan P. Cardenas', text: 'Weekend OT reduced after holiday break. Back to normal staffing January.', createdAt: '2026-01-15T09:00:00Z', versionLabel: 'December 2025 Projection' },
    ],
    [makeLineKey('B-200-', '5SubCont')]: [
      { id: 'dc3', author: 'Trushit Vaishnav', text: 'Erosion control sub mobilized. Forecast tracks with approved CO #2.', createdAt: '2025-11-10T14:30:00Z', versionLabel: 'November 2025 Projection' },
    ],
    [makeLineKey('B-300-', '2Labor')]: [
      { id: 'dc4', author: 'Juan P. Cardenas', text: 'Excavation productivity improving — 15% ahead of plan this month. Unit cost dropping.', createdAt: '2026-02-18T11:00:00Z', versionLabel: 'February 2026 Projection' },
    ],
    [makeLineKey('C-300-', '5SubCont')]: [
      { id: 'dc5', author: 'Juan P. Cardenas', text: 'Paving sub delayed 2 weeks due to plant shutdown. Schedule impact minimal — buffer absorbed.', createdAt: '2026-03-05T08:00:00Z', versionLabel: 'March 2026 Projection' },
    ],
  },
  alertStatus: {},
  financials: {
    months: [
      { date: '2025-09-01', revenue: 195190085, cost: 182968165, profit: 12221920, gpPct: 6.26 },
      { date: '2025-10-01', revenue: 196148483, cost: 182400900, profit: 13747583, gpPct: 7.01 },
      { date: '2025-11-01', revenue: 197200496, cost: 184810995, profit: 12389501, gpPct: 6.28 },
      { date: '2025-12-01', revenue: 205957524, cost: 193521062, profit: 12436462, gpPct: 6.04 },
      { date: '2026-02-01', revenue: 206024808, cost: 193409464, profit: 12615344, gpPct: 6.12 },
      { date: '2026-03-01', revenue: 206489228, cost: 193845447, profit: 12643781, gpPct: 6.11 },
    ],
    originalBid: { revenue: 195180365, cost: 182968165, profit: 12212200, gpPct: 6.26 },
  },
  versions: [
    {
      id: 'sc3a-v1', label: 'September 2025 Projection', createdAt: '2025-09-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: z(), CTD: s(8, 1924, 56078), CTC: z(), F: s(186, 15662, 562804), Est: s(186, 15662, 562804), estVar: 0, comp: 9.96, prevForecast: 562804, calcHrs: 15662, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '3Material'), keyParts: ['B-100-', '3Material'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: z(), CTD: s(209, 0, 4019), CTC: z(), F: s(1619, 0, 15529), Est: s(1619, 0, 29309), estVar: -13780, comp: 25.9, prevForecast: 15529, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: z(), CTD: s(209, 0, 20633), CTC: z(), F: s(1619, 0, 733343), Est: s(1619, 0, 738736), estVar: -5393, comp: 2.81, prevForecast: 733343, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-101-', '2Labor'), keyParts: ['B-101-', '2Labor'], label: 'Traffic Control / Lane Closures', unitOfMeasure: 'ED', CTP: z(), CTD: s(84, 644, 18560), CTC: z(), F: s(326, 9780, 351436), Est: s(326, 9780, 351436), estVar: 0, comp: 5.28, prevForecast: 351436, calcHrs: 9780, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: z(), CTD: s(209, 588, 108972), CTC: z(), F: s(1619, 7312, 1180622), Est: s(1619, 7312, 1228814), estVar: -48192, comp: 9.23, prevForecast: 1180622, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: z(), CTD: s(209, 0, 7920), CTC: z(), F: s(1619, 0, 133224), Est: s(1619, 0, 147000), estVar: -13776, comp: 5.95, prevForecast: 133224, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: z(), CTD: s(12400, 2080, 168740), CTC: z(), F: s(385200, 23100, 2614900), Est: s(385200, 23100, 2614900), estVar: 0, comp: 6.45, prevForecast: 2614900, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: z(), CTD: s(12400, 0, 43400), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 3.22, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: z(), CTD: s(8200, 1640, 144080), CTC: z(), F: s(428750, 18524, 1813780), Est: s(428750, 18524, 1813780), estVar: 0, comp: 7.94, prevForecast: 1813780, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: z(), CTD: s(8200, 0, 115500), CTC: z(), F: s(428750, 0, 8289120), Est: s(428750, 0, 8289120), estVar: 0, comp: 1.39, prevForecast: 8289120, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 42000, 4620000), Est: s(1, 42000, 4620000), estVar: 0, comp: 0, prevForecast: 4620000, calcHrs: 42000, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 0, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 6450000), Est: s(1, 0, 6450000), estVar: 0, comp: 0, prevForecast: 6450000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(142000, 0, 14200000), Est: s(142000, 0, 14200000), estVar: 0, comp: 0, prevForecast: 14200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Signing & Pavement Markings', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 18500000), Est: s(1, 0, 18500000), estVar: 0, comp: 0, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 45200), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 1.89, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 128400), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 1.89, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'sc3a-v2', label: 'October 2025 Projection', createdAt: '2025-10-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(8, 1924, 56078), CTD: s(16, 3848, 118400), CTC: z(), F: s(186, 15662, 575000), Est: s(186, 15662, 562804), estVar: 12196, comp: 20.6, prevForecast: 562804, calcHrs: 15662, wsRisk: 18000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '3Material'), keyParts: ['B-100-', '3Material'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(209, 0, 4019), CTD: s(418, 0, 8038), CTC: z(), F: s(1619, 0, 15529), Est: s(1619, 0, 29309), estVar: -13780, comp: 51.8, prevForecast: 15529, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(209, 0, 20633), CTD: s(418, 0, 41266), CTC: z(), F: s(1619, 0, 733343), Est: s(1619, 0, 738736), estVar: -5393, comp: 5.63, prevForecast: 733343, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-101-', '2Labor'), keyParts: ['B-101-', '2Labor'], label: 'Traffic Control / Lane Closures', unitOfMeasure: 'ED', CTP: s(84, 644, 18560), CTD: s(168, 1288, 42800), CTC: z(), F: s(326, 9780, 360000), Est: s(326, 9780, 351436), estVar: 8564, comp: 11.9, prevForecast: 351436, calcHrs: 9780, wsRisk: 12000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(209, 588, 108972), CTD: s(418, 1176, 224800), CTC: z(), F: s(1619, 7312, 1195000), Est: s(1619, 7312, 1228814), estVar: -33814, comp: 18.8, prevForecast: 1180622, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(209, 0, 7920), CTD: s(418, 0, 18200), CTC: z(), F: s(1619, 0, 140000), Est: s(1619, 0, 147000), estVar: -7000, comp: 13.0, prevForecast: 133224, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(12400, 2080, 168740), CTD: s(38500, 4160, 378200), CTC: z(), F: s(385200, 23100, 2614900), Est: s(385200, 23100, 2614900), estVar: 0, comp: 14.5, prevForecast: 2614900, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(12400, 0, 43400), CTD: s(38500, 0, 134750), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 9.99, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(8200, 1640, 144080), CTD: s(28000, 3480, 311200), CTC: z(), F: s(428750, 18524, 1813780), Est: s(428750, 18524, 1813780), estVar: 0, comp: 17.2, prevForecast: 1813780, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(8200, 0, 115500), CTD: s(28000, 0, 420000), CTC: z(), F: s(428750, 0, 8289120), Est: s(428750, 0, 8289120), estVar: 0, comp: 5.07, prevForecast: 8289120, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.05, 2100, 231000), CTC: z(), F: s(1, 42000, 4620000), Est: s(1, 42000, 4620000), estVar: 0, comp: 5.0, prevForecast: 4620000, calcHrs: 42000, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: z(), CTD: s(920, 0, 138000), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 4.97, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.02, 0, 129000), CTC: z(), F: s(1, 0, 6450000), Est: s(1, 0, 6450000), estVar: 0, comp: 2.0, prevForecast: 6450000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(142000, 0, 14200000), Est: s(142000, 0, 14200000), estVar: 0, comp: 0, prevForecast: 14200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Signing & Pavement Markings', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 18500000), Est: s(1, 0, 18500000), estVar: 0, comp: 0, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(1, 0, 45200), CTD: s(2, 0, 90400), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 3.77, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(1, 0, 128400), CTD: s(2, 0, 256800), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 3.77, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'sc3a-v3', label: 'November 2025 Projection', createdAt: '2025-11-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(16, 3848, 118400), CTD: s(24, 5772, 182500), CTC: z(), F: s(186, 15662, 580000), Est: s(186, 15662, 562804), estVar: 17196, comp: 31.5, prevForecast: 575000, calcHrs: 15662, wsRisk: 24000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(418, 0, 41266), CTD: s(627, 0, 68400), CTC: z(), F: s(1619, 0, 745000), Est: s(1619, 0, 738736), estVar: 6264, comp: 9.18, prevForecast: 733343, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(418, 1176, 224800), CTD: s(627, 1764, 345200), CTC: z(), F: s(1619, 7312, 1210000), Est: s(1619, 7312, 1228814), estVar: -18814, comp: 28.5, prevForecast: 1195000, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(418, 0, 18200), CTD: s(627, 0, 31400), CTC: z(), F: s(1619, 0, 145000), Est: s(1619, 0, 147000), estVar: -2000, comp: 21.7, prevForecast: 140000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(38500, 4160, 378200), CTD: s(82000, 6240, 598400), CTC: z(), F: s(385200, 23100, 2580000), Est: s(385200, 23100, 2614900), estVar: -34900, comp: 23.2, prevForecast: 2614900, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(38500, 0, 134750), CTD: s(82000, 0, 287000), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 21.3, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(28000, 3480, 311200), CTD: s(64000, 5620, 498000), CTC: z(), F: s(428750, 18524, 1830000), Est: s(428750, 18524, 1813780), estVar: 16220, comp: 27.2, prevForecast: 1813780, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(28000, 0, 420000), CTD: s(64000, 0, 960000), CTC: z(), F: s(428750, 0, 8350000), Est: s(428750, 0, 8289120), estVar: 60880, comp: 11.5, prevForecast: 8289120, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: s(0.05, 2100, 231000), CTD: s(0.12, 5040, 554400), CTC: z(), F: s(1, 42000, 4620000), Est: s(1, 42000, 4620000), estVar: 0, comp: 12.0, prevForecast: 4620000, calcHrs: 42000, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: s(920, 0, 138000), CTD: s(2200, 0, 330000), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 11.9, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: s(0.02, 0, 129000), CTD: s(0.08, 0, 516000), CTC: z(), F: s(1, 0, 6450000), Est: s(1, 0, 6450000), estVar: 0, comp: 8.0, prevForecast: 6450000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: z(), CTD: s(4200, 0, 420000), CTC: z(), F: s(142000, 0, 14200000), Est: s(142000, 0, 14200000), estVar: 0, comp: 2.96, prevForecast: 14200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Signing & Pavement Markings', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.03, 0, 555000), CTC: z(), F: s(1, 0, 18500000), Est: s(1, 0, 18500000), estVar: 0, comp: 3.0, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(2, 0, 90400), CTD: s(3, 0, 135600), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 5.66, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(2, 0, 256800), CTD: s(3, 0, 385200), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 5.66, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'sc3a-v4', label: 'December 2025 Projection', createdAt: '2025-12-31T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(24, 5772, 182500), CTD: s(32, 7696, 248000), CTC: z(), F: s(186, 15662, 585000), Est: s(186, 15662, 562804), estVar: 22196, comp: 42.4, prevForecast: 580000, calcHrs: 15662, wsRisk: 30000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(627, 0, 68400), CTD: s(836, 0, 98700), CTC: z(), F: s(1619, 0, 750000), Est: s(1619, 0, 738736), estVar: 11264, comp: 13.2, prevForecast: 745000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(627, 1764, 345200), CTD: s(836, 2352, 472000), CTC: z(), F: s(1619, 7312, 1215000), Est: s(1619, 7312, 1228814), estVar: -13814, comp: 38.8, prevForecast: 1210000, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(82000, 6240, 598400), CTD: s(142000, 8840, 862000), CTC: z(), F: s(385200, 23100, 2540000), Est: s(385200, 23100, 2614900), estVar: -74900, comp: 33.9, prevForecast: 2580000, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(82000, 0, 287000), CTD: s(142000, 0, 497000), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 36.9, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(64000, 5620, 498000), CTD: s(115000, 8200, 724000), CTC: z(), F: s(428750, 18524, 1840000), Est: s(428750, 18524, 1813780), estVar: 26220, comp: 39.3, prevForecast: 1830000, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(64000, 0, 960000), CTD: s(115000, 0, 1725000), CTC: z(), F: s(428750, 0, 8400000), Est: s(428750, 0, 8289120), estVar: 110880, comp: 20.5, prevForecast: 8350000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: s(0.12, 5040, 554400), CTD: s(0.2, 8400, 924000), CTC: z(), F: s(1, 42000, 4700000), Est: s(1, 42000, 4620000), estVar: 80000, comp: 19.7, prevForecast: 4620000, calcHrs: 42000, wsRisk: 120000, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: s(2200, 0, 330000), CTD: s(3700, 0, 555000), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 20.0, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: s(0.08, 0, 516000), CTD: s(0.15, 0, 967500), CTC: z(), F: s(1, 0, 6500000), Est: s(1, 0, 6450000), estVar: 50000, comp: 14.9, prevForecast: 6450000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: s(4200, 0, 420000), CTD: s(14200, 0, 1420000), CTC: z(), F: s(142000, 0, 14350000), Est: s(142000, 0, 14200000), estVar: 150000, comp: 9.9, prevForecast: 14200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Signing & Pavement Markings', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: s(0.03, 0, 555000), CTD: s(0.08, 0, 1480000), CTC: z(), F: s(1, 0, 18500000), Est: s(1, 0, 18500000), estVar: 0, comp: 8.0, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(3, 0, 135600), CTD: s(4, 0, 180800), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 7.55, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(3, 0, 385200), CTD: s(4, 0, 513600), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 7.55, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'sc3a-v5', label: 'February 2026 Projection', createdAt: '2026-02-28T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(32, 7696, 248000), CTD: s(40, 9620, 318000), CTC: z(), F: s(186, 15662, 590000), Est: s(186, 15662, 562804), estVar: 27196, comp: 53.9, prevForecast: 585000, calcHrs: 15662, wsRisk: 35000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(836, 0, 98700), CTD: s(1045, 0, 128400), CTC: z(), F: s(1619, 0, 755000), Est: s(1619, 0, 738736), estVar: 16264, comp: 17.0, prevForecast: 750000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(836, 2352, 472000), CTD: s(1045, 2940, 604000), CTC: z(), F: s(1619, 7312, 1220000), Est: s(1619, 7312, 1228814), estVar: -8814, comp: 49.5, prevForecast: 1215000, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(142000, 8840, 862000), CTD: s(224000, 12480, 1248000), CTC: z(), F: s(385200, 23100, 2480000), Est: s(385200, 23100, 2614900), estVar: -134900, comp: 50.3, prevForecast: 2540000, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(142000, 0, 497000), CTD: s(224000, 0, 784000), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 58.1, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(115000, 8200, 724000), CTD: s(185000, 11400, 1012000), CTC: z(), F: s(428750, 18524, 1850000), Est: s(428750, 18524, 1813780), estVar: 36220, comp: 54.7, prevForecast: 1840000, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(115000, 0, 1725000), CTD: s(185000, 0, 2775000), CTC: z(), F: s(428750, 0, 8450000), Est: s(428750, 0, 8289120), estVar: 160880, comp: 32.8, prevForecast: 8400000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: s(0.2, 8400, 924000), CTD: s(0.32, 13440, 1478400), CTC: z(), F: s(1, 42000, 4720000), Est: s(1, 42000, 4620000), estVar: 100000, comp: 31.3, prevForecast: 4700000, calcHrs: 42000, wsRisk: 140000, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: s(3700, 0, 555000), CTD: s(6100, 0, 915000), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 33.0, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: s(0.15, 0, 967500), CTD: s(0.28, 0, 1806000), CTC: z(), F: s(1, 0, 6500000), Est: s(1, 0, 6450000), estVar: 50000, comp: 27.8, prevForecast: 6500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: s(14200, 0, 1420000), CTD: s(32800, 0, 3280000), CTC: z(), F: s(142000, 0, 14500000), Est: s(142000, 0, 14200000), estVar: 300000, comp: 22.6, prevForecast: 14350000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: s(0.08, 0, 1480000), CTD: s(0.15, 0, 2775000), CTC: z(), F: s(1, 0, 18500000), Est: s(1, 0, 18500000), estVar: 0, comp: 15.0, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(4, 0, 180800), CTD: s(6, 0, 271200), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 11.3, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(4, 0, 513600), CTD: s(6, 0, 770400), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 11.3, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'sc3a-v6', label: 'March 2026 Projection', createdAt: '2026-03-26T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(40, 9620, 318000), CTD: s(48, 11544, 392000), CTC: z(), F: s(186, 15662, 595000), Est: s(186, 15662, 562804), estVar: 32196, comp: 65.9, prevForecast: 590000, calcHrs: 15662, wsRisk: 42000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'DAY', CTP: s(1045, 0, 128400), CTD: s(1254, 0, 158200), CTC: z(), F: s(1619, 0, 760000), Est: s(1619, 0, 738736), estVar: 21264, comp: 20.8, prevForecast: 755000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Erosion Control', unitOfMeasure: 'DY', CTP: s(1045, 2940, 604000), CTD: s(1254, 3528, 740000), CTC: z(), F: s(1619, 7312, 1225000), Est: s(1619, 7312, 1228814), estVar: -3814, comp: 60.4, prevForecast: 1220000, calcHrs: 7312, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '2Labor'), keyParts: ['B-300-', '2Labor'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(224000, 12480, 1248000), CTD: s(296000, 15600, 1592000), CTC: z(), F: s(385200, 23100, 2420000), Est: s(385200, 23100, 2614900), estVar: -194900, comp: 65.8, prevForecast: 2480000, calcHrs: 23100, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-300-', '3Material'), keyParts: ['B-300-', '3Material'], label: 'Excavation - Roadway', unitOfMeasure: 'CY', CTP: s(224000, 0, 784000), CTD: s(296000, 0, 1036000), CTC: z(), F: s(385200, 0, 1348200), Est: s(385200, 0, 1348200), estVar: 0, comp: 76.8, prevForecast: 1348200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '2Labor'), keyParts: ['B-350-', '2Labor'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(185000, 11400, 1012000), CTD: s(258000, 14200, 1340000), CTC: z(), F: s(428750, 18524, 1860000), Est: s(428750, 18524, 1813780), estVar: 46220, comp: 72.0, prevForecast: 1850000, calcHrs: 18524, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-350-', '5SubCont'), keyParts: ['B-350-', '5SubCont'], label: 'Place & Compact Fill', unitOfMeasure: 'CY', CTP: s(185000, 0, 2775000), CTD: s(258000, 0, 3870000), CTC: z(), F: s(428750, 0, 8500000), Est: s(428750, 0, 8289120), estVar: 210880, comp: 45.5, prevForecast: 8450000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Concrete Structures', unitOfMeasure: 'LS', CTP: s(0.32, 13440, 1478400), CTD: s(0.42, 17640, 1940400), CTC: z(), F: s(1, 42000, 4750000), Est: s(1, 42000, 4620000), estVar: 130000, comp: 40.9, prevForecast: 4720000, calcHrs: 42000, wsRisk: 180000, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Concrete Structures', unitOfMeasure: 'CY', CTP: s(6100, 0, 915000), CTD: s(8200, 0, 1230000), CTC: z(), F: s(18500, 0, 2775000), Est: s(18500, 0, 2775000), estVar: 0, comp: 44.3, prevForecast: 2775000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '5SubCont'), keyParts: ['C-200-', '5SubCont'], label: 'Drainage Structures', unitOfMeasure: 'LS', CTP: s(0.28, 0, 1806000), CTD: s(0.38, 0, 2451000), CTC: z(), F: s(1, 0, 6500000), Est: s(1, 0, 6450000), estVar: 50000, comp: 37.7, prevForecast: 6500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-300-', '5SubCont'), keyParts: ['C-300-', '5SubCont'], label: 'Asphalt Paving', unitOfMeasure: 'TON', CTP: s(32800, 0, 3280000), CTD: s(48500, 0, 4850000), CTC: z(), F: s(142000, 0, 14600000), Est: s(142000, 0, 14200000), estVar: 400000, comp: 33.2, prevForecast: 14500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Signing & Pavement Markings', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.05, 0, 160000), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 5.0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Electrical & ITS', unitOfMeasure: 'LS', CTP: s(0.15, 0, 2775000), CTD: s(0.22, 0, 4070000), CTC: z(), F: s(1, 0, 18700000), Est: s(1, 0, 18500000), estVar: 200000, comp: 21.8, prevForecast: 18500000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '9Owned'), keyParts: ['E-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(6, 0, 271200), CTD: s(7, 0, 316400), CTC: z(), F: s(53, 0, 2395600), Est: s(53, 0, 2395600), estVar: 0, comp: 13.2, prevForecast: 2395600, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '6OtherJC'), keyParts: ['E-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(6, 0, 770400), CTD: s(7, 0, 898800), CTC: z(), F: s(53, 0, 6805200), Est: s(53, 0, 6805200), estVar: 0, comp: 13.2, prevForecast: 6805200, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Project 2: Bayshore Boulevard Widening — Trushit Vaishnav
// $48M project, Suncoast Development Group, 4 versions
// ---------------------------------------------------------------------------

const BAYSHORE: Partial<ProjectionProject> = {
  id: 'demo-bayshore',
  name: 'Bayshore Blvd Widening',
  jobNumber: '25812',
  customer: 'Suncoast Development Group',
  pm: 'Trushit Vaishnav',
  createdAt: '2025-11-01T00:00:00.000Z',
  draft: null,
  comments: {
    [makeLineKey('B-100-', '2Labor')]: [
      { id: 'bc1', author: 'Trushit Vaishnav', text: 'MOT plan revised after FDOT review. Nightwork phasing approved for Q1 2026.', createdAt: '2025-12-10T09:00:00Z', versionLabel: 'December 2025 Projection' },
    ],
    [makeLineKey('C-100-', '5SubCont')]: [
      { id: 'bc2', author: 'Trushit Vaishnav', text: 'Utility relocation sub delayed 3 weeks. Awaiting easement clearance from city.', createdAt: '2026-02-20T14:00:00Z', versionLabel: 'February 2026 Projection' },
    ],
  },
  alertStatus: {},
  financials: {
    months: [
      { date: '2025-11-01', revenue: 48200000, cost: 42900000, profit: 5300000, gpPct: 11.0 },
      { date: '2025-12-01', revenue: 48200000, cost: 43100000, profit: 5100000, gpPct: 10.6 },
      { date: '2026-01-01', revenue: 48500000, cost: 43400000, profit: 5100000, gpPct: 10.5 },
      { date: '2026-02-01', revenue: 48800000, cost: 43800000, profit: 5000000, gpPct: 10.2 },
    ],
    originalBid: { revenue: 48200000, cost: 42900000, profit: 5300000, gpPct: 11.0 },
  },
  versions: [
    {
      id: 'bay-v1', label: 'November 2025 Projection', createdAt: '2025-11-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: z(), CTD: s(2, 480, 38400), CTC: z(), F: s(24, 5760, 460800), Est: s(24, 5760, 460800), estVar: 0, comp: 8.3, prevForecast: 460800, calcHrs: 5760, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: z(), CTD: s(2, 0, 72000), CTC: z(), F: s(24, 0, 864000), Est: s(24, 0, 864000), estVar: 0, comp: 8.3, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Earthwork / Grading', unitOfMeasure: 'HR', CTP: z(), CTD: s(320, 320, 28800), CTC: z(), F: s(4800, 4800, 432000), Est: s(4800, 4800, 432000), estVar: 0, comp: 6.7, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Earthwork', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 28000), CTC: z(), F: s(12, 0, 336000), Est: s(12, 0, 336000), estVar: 0, comp: 8.3, prevForecast: 336000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Earthwork / Hauling', unitOfMeasure: 'CY', CTP: z(), CTD: s(4200, 0, 126000), CTC: z(), F: s(85000, 0, 2550000), Est: s(85000, 0, 2550000), estVar: 0, comp: 4.9, prevForecast: 2550000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Roadway Base', unitOfMeasure: 'SY', CTP: z(), CTD: z(), CTC: z(), F: s(32000, 6400, 576000), Est: s(32000, 6400, 576000), estVar: 0, comp: 0, prevForecast: 576000, calcHrs: 6400, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Roadway Base', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(24000, 0, 720000), Est: s(24000, 0, 720000), estVar: 0, comp: 0, prevForecast: 720000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utility Relocation', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 4800000), Est: s(1, 0, 4800000), estVar: 0, comp: 0, prevForecast: 4800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Asphalt / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(48000, 0, 4320000), Est: s(48000, 0, 4320000), estVar: 0, comp: 0, prevForecast: 4320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Drainage / Pipe & Structures', unitOfMeasure: 'LF', CTP: z(), CTD: z(), CTC: z(), F: s(12000, 0, 1800000), Est: s(12000, 0, 1800000), estVar: 0, comp: 0, prevForecast: 1800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Lighting & Signals', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 2400000), Est: s(1, 0, 2400000), estVar: 0, comp: 0, prevForecast: 2400000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 18500), CTC: z(), F: s(24, 0, 444000), Est: s(24, 0, 444000), estVar: 0, comp: 4.2, prevForecast: 444000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 42000), CTC: z(), F: s(24, 0, 1008000), Est: s(24, 0, 1008000), estVar: 0, comp: 4.2, prevForecast: 1008000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'bay-v2', label: 'December 2025 Projection', createdAt: '2025-12-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(2, 480, 38400), CTD: s(4, 960, 82000), CTC: z(), F: s(24, 5760, 480000), Est: s(24, 5760, 460800), estVar: 19200, comp: 17.1, prevForecast: 460800, calcHrs: 5760, wsRisk: 24000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(2, 0, 72000), CTD: s(4, 0, 148000), CTC: z(), F: s(24, 0, 888000), Est: s(24, 0, 864000), estVar: 24000, comp: 16.7, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Earthwork / Grading', unitOfMeasure: 'HR', CTP: s(320, 320, 28800), CTD: s(880, 880, 79200), CTC: z(), F: s(4800, 4800, 432000), Est: s(4800, 4800, 432000), estVar: 0, comp: 18.3, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Earthwork', unitOfMeasure: 'MO', CTP: s(1, 0, 28000), CTD: s(2, 0, 56000), CTC: z(), F: s(12, 0, 336000), Est: s(12, 0, 336000), estVar: 0, comp: 16.7, prevForecast: 336000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Earthwork / Hauling', unitOfMeasure: 'CY', CTP: s(4200, 0, 126000), CTD: s(14800, 0, 444000), CTC: z(), F: s(85000, 0, 2550000), Est: s(85000, 0, 2550000), estVar: 0, comp: 17.4, prevForecast: 2550000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Roadway Base', unitOfMeasure: 'SY', CTP: z(), CTD: s(3200, 640, 57600), CTC: z(), F: s(32000, 6400, 576000), Est: s(32000, 6400, 576000), estVar: 0, comp: 10.0, prevForecast: 576000, calcHrs: 6400, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Roadway Base', unitOfMeasure: 'TON', CTP: z(), CTD: s(2400, 0, 72000), CTC: z(), F: s(24000, 0, 720000), Est: s(24000, 0, 720000), estVar: 0, comp: 10.0, prevForecast: 720000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utility Relocation', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.04, 0, 192000), CTC: z(), F: s(1, 0, 4950000), Est: s(1, 0, 4800000), estVar: 150000, comp: 3.9, prevForecast: 4800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Asphalt / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(48000, 0, 4320000), Est: s(48000, 0, 4320000), estVar: 0, comp: 0, prevForecast: 4320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Drainage / Pipe & Structures', unitOfMeasure: 'LF', CTP: z(), CTD: s(1200, 0, 180000), CTC: z(), F: s(12000, 0, 1800000), Est: s(12000, 0, 1800000), estVar: 0, comp: 10.0, prevForecast: 1800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Lighting & Signals', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 2400000), Est: s(1, 0, 2400000), estVar: 0, comp: 0, prevForecast: 2400000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(1, 0, 18500), CTD: s(2, 0, 37000), CTC: z(), F: s(24, 0, 444000), Est: s(24, 0, 444000), estVar: 0, comp: 8.3, prevForecast: 444000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(1, 0, 42000), CTD: s(2, 0, 84000), CTC: z(), F: s(24, 0, 1008000), Est: s(24, 0, 1008000), estVar: 0, comp: 8.3, prevForecast: 1008000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'bay-v3', label: 'January 2026 Projection', createdAt: '2026-01-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(4, 960, 82000), CTD: s(6, 1440, 126000), CTC: z(), F: s(24, 5760, 492000), Est: s(24, 5760, 460800), estVar: 31200, comp: 25.6, prevForecast: 480000, calcHrs: 5760, wsRisk: 32000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(4, 0, 148000), CTD: s(6, 0, 228000), CTC: z(), F: s(24, 0, 900000), Est: s(24, 0, 864000), estVar: 36000, comp: 25.3, prevForecast: 888000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Earthwork / Grading', unitOfMeasure: 'HR', CTP: s(880, 880, 79200), CTD: s(1600, 1600, 144000), CTC: z(), F: s(4800, 4800, 432000), Est: s(4800, 4800, 432000), estVar: 0, comp: 33.3, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Earthwork / Hauling', unitOfMeasure: 'CY', CTP: s(14800, 0, 444000), CTD: s(28000, 0, 840000), CTC: z(), F: s(85000, 0, 2550000), Est: s(85000, 0, 2550000), estVar: 0, comp: 32.9, prevForecast: 2550000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Roadway Base', unitOfMeasure: 'SY', CTP: s(3200, 640, 57600), CTD: s(8000, 1600, 144000), CTC: z(), F: s(32000, 6400, 576000), Est: s(32000, 6400, 576000), estVar: 0, comp: 25.0, prevForecast: 576000, calcHrs: 6400, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Roadway Base', unitOfMeasure: 'TON', CTP: s(2400, 0, 72000), CTD: s(6000, 0, 180000), CTC: z(), F: s(24000, 0, 720000), Est: s(24000, 0, 720000), estVar: 0, comp: 25.0, prevForecast: 720000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utility Relocation', unitOfMeasure: 'LS', CTP: s(0.04, 0, 192000), CTD: s(0.1, 0, 480000), CTC: z(), F: s(1, 0, 5100000), Est: s(1, 0, 4800000), estVar: 300000, comp: 9.4, prevForecast: 4950000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Asphalt / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: s(4800, 0, 432000), CTC: z(), F: s(48000, 0, 4320000), Est: s(48000, 0, 4320000), estVar: 0, comp: 10.0, prevForecast: 4320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Drainage / Pipe & Structures', unitOfMeasure: 'LF', CTP: s(1200, 0, 180000), CTD: s(3000, 0, 450000), CTC: z(), F: s(12000, 0, 1800000), Est: s(12000, 0, 1800000), estVar: 0, comp: 25.0, prevForecast: 1800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Lighting & Signals', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 2400000), Est: s(1, 0, 2400000), estVar: 0, comp: 0, prevForecast: 2400000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(2, 0, 37000), CTD: s(3, 0, 55500), CTC: z(), F: s(24, 0, 444000), Est: s(24, 0, 444000), estVar: 0, comp: 12.5, prevForecast: 444000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(2, 0, 84000), CTD: s(3, 0, 126000), CTC: z(), F: s(24, 0, 1008000), Est: s(24, 0, 1008000), estVar: 0, comp: 12.5, prevForecast: 1008000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'bay-v4', label: 'February 2026 Projection', createdAt: '2026-02-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(6, 1440, 126000), CTD: s(8, 1920, 172000), CTC: z(), F: s(24, 5760, 504000), Est: s(24, 5760, 460800), estVar: 43200, comp: 34.1, prevForecast: 492000, calcHrs: 5760, wsRisk: 40000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '5SubCont'), keyParts: ['B-100-', '5SubCont'], label: 'Traffic Control / MOT', unitOfMeasure: 'MOS', CTP: s(6, 0, 228000), CTD: s(8, 0, 312000), CTC: z(), F: s(24, 0, 920000), Est: s(24, 0, 864000), estVar: 56000, comp: 33.9, prevForecast: 900000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Earthwork / Grading', unitOfMeasure: 'HR', CTP: s(1600, 1600, 144000), CTD: s(2400, 2400, 216000), CTC: z(), F: s(4800, 4800, 432000), Est: s(4800, 4800, 432000), estVar: 0, comp: 50.0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '5SubCont'), keyParts: ['B-200-', '5SubCont'], label: 'Earthwork / Hauling', unitOfMeasure: 'CY', CTP: s(28000, 0, 840000), CTD: s(42500, 0, 1275000), CTC: z(), F: s(85000, 0, 2550000), Est: s(85000, 0, 2550000), estVar: 0, comp: 50.0, prevForecast: 2550000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Roadway Base', unitOfMeasure: 'SY', CTP: s(8000, 1600, 144000), CTD: s(14400, 2880, 259200), CTC: z(), F: s(32000, 6400, 576000), Est: s(32000, 6400, 576000), estVar: 0, comp: 45.0, prevForecast: 576000, calcHrs: 6400, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utility Relocation', unitOfMeasure: 'LS', CTP: s(0.1, 0, 480000), CTD: s(0.18, 0, 918000), CTC: z(), F: s(1, 0, 5200000), Est: s(1, 0, 4800000), estVar: 400000, comp: 17.7, prevForecast: 5100000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Asphalt / Paving', unitOfMeasure: 'TON', CTP: s(4800, 0, 432000), CTD: s(12000, 0, 1080000), CTC: z(), F: s(48000, 0, 4320000), Est: s(48000, 0, 4320000), estVar: 0, comp: 25.0, prevForecast: 4320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-200-', '5SubCont'), keyParts: ['D-200-', '5SubCont'], label: 'Drainage / Pipe & Structures', unitOfMeasure: 'LF', CTP: s(3000, 0, 450000), CTD: s(5400, 0, 810000), CTC: z(), F: s(12000, 0, 1800000), Est: s(12000, 0, 1800000), estVar: 0, comp: 45.0, prevForecast: 1800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Lighting & Signals', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.05, 0, 120000), CTC: z(), F: s(1, 0, 2400000), Est: s(1, 0, 2400000), estVar: 0, comp: 5.0, prevForecast: 2400000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(3, 0, 55500), CTD: s(4, 0, 74000), CTC: z(), F: s(24, 0, 444000), Est: s(24, 0, 444000), estVar: 0, comp: 16.7, prevForecast: 444000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(3, 0, 126000), CTD: s(4, 0, 168000), CTC: z(), F: s(24, 0, 1008000), Est: s(24, 0, 1008000), estVar: 0, comp: 16.7, prevForecast: 1008000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Project 3: Palm Harbor Bridge — Juan P. Cardenas, $72M, 3 versions
// ---------------------------------------------------------------------------

const PALM_HARBOR: Partial<ProjectionProject> = {
  id: 'demo-palm-harbor',
  name: 'Palm Harbor Bridge Replacement',
  jobNumber: '25819',
  customer: 'Palomar Properties',
  pm: 'Juan P. Cardenas',
  createdAt: '2026-01-01T00:00:00.000Z',
  draft: null,
  comments: {
    [makeLineKey('B-100-', '2Labor')]: [
      { id: 'pc1', author: 'Juan P. Cardenas', text: 'Cofferdam install behind schedule — dewatering issues. Additional pumps mobilized.', createdAt: '2026-02-22T10:00:00Z', versionLabel: 'February 2026 Projection' },
    ],
  },
  alertStatus: {},
  financials: {
    months: [
      { date: '2026-01-01', revenue: 72400000, cost: 63700000, profit: 8700000, gpPct: 12.0 },
      { date: '2026-02-01', revenue: 72400000, cost: 64200000, profit: 8200000, gpPct: 11.3 },
      { date: '2026-03-01', revenue: 73100000, cost: 65100000, profit: 8000000, gpPct: 10.9 },
    ],
    originalBid: { revenue: 72400000, cost: 63700000, profit: 8700000, gpPct: 12.0 },
  },
  versions: [
    {
      id: 'ph-v1', label: 'January 2026 Projection', createdAt: '2026-01-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'HR', CTP: z(), CTD: s(480, 480, 48000), CTC: z(), F: s(8400, 8400, 840000), Est: s(8400, 8400, 840000), estVar: 0, comp: 5.7, prevForecast: 840000, calcHrs: 8400, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '4Rental'), keyParts: ['B-100-', '4Rental'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 85000), CTC: z(), F: s(18, 0, 1530000), Est: s(18, 0, 1530000), estVar: 0, comp: 5.6, prevForecast: 1530000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Pile Driving', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(240, 9600, 1200000), Est: s(240, 9600, 1200000), estVar: 0, comp: 0, prevForecast: 1200000, calcHrs: 9600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '3Material'), keyParts: ['B-200-', '3Material'], label: 'Pile Driving / Piles', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(240, 0, 3600000), Est: s(240, 0, 3600000), estVar: 0, comp: 0, prevForecast: 3600000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(4200, 16800, 1848000), Est: s(4200, 16800, 1848000), estVar: 0, comp: 0, prevForecast: 1848000, calcHrs: 16800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(4200, 0, 630000), Est: s(4200, 0, 630000), estVar: 0, comp: 0, prevForecast: 630000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '2Labor'), keyParts: ['C-200-', '2Labor'], label: 'Superstructure / Girder Erection', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 4800, 528000), Est: s(48, 4800, 528000), estVar: 0, comp: 0, prevForecast: 528000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '3Material'), keyParts: ['C-200-', '3Material'], label: 'Superstructure / Precast Girders', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 0, 7200000), Est: s(48, 0, 7200000), estVar: 0, comp: 0, prevForecast: 7200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Bridge Deck', unitOfMeasure: 'SF', CTP: z(), CTD: z(), CTC: z(), F: s(42000, 12600, 1386000), Est: s(42000, 12600, 1386000), estVar: 0, comp: 0, prevForecast: 1386000, calcHrs: 12600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '3Material'), keyParts: ['D-100-', '3Material'], label: 'Bridge Deck / Concrete & Rebar', unitOfMeasure: 'SF', CTP: z(), CTD: z(), CTC: z(), F: s(42000, 0, 2520000), Est: s(42000, 0, 2520000), estVar: 0, comp: 0, prevForecast: 2520000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Approach Roadwork', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 8200000), Est: s(1, 0, 8200000), estVar: 0, comp: 0, prevForecast: 8200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 32000), CTC: z(), F: s(30, 0, 960000), Est: s(30, 0, 960000), estVar: 0, comp: 3.3, prevForecast: 960000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 72000), CTC: z(), F: s(30, 0, 2160000), Est: s(30, 0, 2160000), estVar: 0, comp: 3.3, prevForecast: 2160000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'ph-v2', label: 'February 2026 Projection', createdAt: '2026-02-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'HR', CTP: s(480, 480, 48000), CTD: s(1200, 1200, 132000), CTC: z(), F: s(8400, 8400, 920000), Est: s(8400, 8400, 840000), estVar: 80000, comp: 14.3, prevForecast: 840000, calcHrs: 8400, wsRisk: 90000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '4Rental'), keyParts: ['B-100-', '4Rental'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'MO', CTP: s(1, 0, 85000), CTD: s(2, 0, 185000), CTC: z(), F: s(20, 0, 1700000), Est: s(18, 0, 1530000), estVar: 170000, comp: 10.9, prevForecast: 1530000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Pile Driving', unitOfMeasure: 'EA', CTP: z(), CTD: s(24, 960, 120000), CTC: z(), F: s(240, 9600, 1200000), Est: s(240, 9600, 1200000), estVar: 0, comp: 10.0, prevForecast: 1200000, calcHrs: 9600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '3Material'), keyParts: ['B-200-', '3Material'], label: 'Pile Driving / Piles', unitOfMeasure: 'EA', CTP: z(), CTD: s(24, 0, 360000), CTC: z(), F: s(240, 0, 3600000), Est: s(240, 0, 3600000), estVar: 0, comp: 10.0, prevForecast: 3600000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(4200, 16800, 1848000), Est: s(4200, 16800, 1848000), estVar: 0, comp: 0, prevForecast: 1848000, calcHrs: 16800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(4200, 0, 630000), Est: s(4200, 0, 630000), estVar: 0, comp: 0, prevForecast: 630000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '2Labor'), keyParts: ['C-200-', '2Labor'], label: 'Superstructure / Girder Erection', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 4800, 528000), Est: s(48, 4800, 528000), estVar: 0, comp: 0, prevForecast: 528000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '3Material'), keyParts: ['C-200-', '3Material'], label: 'Superstructure / Precast Girders', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 0, 7200000), Est: s(48, 0, 7200000), estVar: 0, comp: 0, prevForecast: 7200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Bridge Deck', unitOfMeasure: 'SF', CTP: z(), CTD: z(), CTC: z(), F: s(42000, 12600, 1386000), Est: s(42000, 12600, 1386000), estVar: 0, comp: 0, prevForecast: 1386000, calcHrs: 12600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '3Material'), keyParts: ['D-100-', '3Material'], label: 'Bridge Deck / Concrete & Rebar', unitOfMeasure: 'SF', CTP: z(), CTD: z(), CTC: z(), F: s(42000, 0, 2520000), Est: s(42000, 0, 2520000), estVar: 0, comp: 0, prevForecast: 2520000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Approach Roadwork', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 8200000), Est: s(1, 0, 8200000), estVar: 0, comp: 0, prevForecast: 8200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(1, 0, 32000), CTD: s(2, 0, 64000), CTC: z(), F: s(30, 0, 960000), Est: s(30, 0, 960000), estVar: 0, comp: 6.7, prevForecast: 960000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(1, 0, 72000), CTD: s(2, 0, 144000), CTC: z(), F: s(30, 0, 2160000), Est: s(30, 0, 2160000), estVar: 0, comp: 6.7, prevForecast: 2160000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'ph-v3', label: 'March 2026 Projection', createdAt: '2026-03-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'HR', CTP: s(1200, 1200, 132000), CTD: s(2100, 2100, 241500), CTC: z(), F: s(8400, 8400, 966000), Est: s(8400, 8400, 840000), estVar: 126000, comp: 25.0, prevForecast: 920000, calcHrs: 8400, wsRisk: 150000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-100-', '4Rental'), keyParts: ['B-100-', '4Rental'], label: 'Cofferdam & Dewatering', unitOfMeasure: 'MO', CTP: s(2, 0, 185000), CTD: s(3, 0, 292000), CTC: z(), F: s(20, 0, 1750000), Est: s(18, 0, 1530000), estVar: 220000, comp: 16.7, prevForecast: 1700000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Pile Driving', unitOfMeasure: 'EA', CTP: s(24, 960, 120000), CTD: s(72, 2880, 360000), CTC: z(), F: s(240, 9600, 1200000), Est: s(240, 9600, 1200000), estVar: 0, comp: 30.0, prevForecast: 1200000, calcHrs: 9600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '3Material'), keyParts: ['B-200-', '3Material'], label: 'Pile Driving / Piles', unitOfMeasure: 'EA', CTP: s(24, 0, 360000), CTD: s(72, 0, 1080000), CTC: z(), F: s(240, 0, 3600000), Est: s(240, 0, 3600000), estVar: 0, comp: 30.0, prevForecast: 3600000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: s(420, 1680, 184800), CTC: z(), F: s(4200, 16800, 1848000), Est: s(4200, 16800, 1848000), estVar: 0, comp: 10.0, prevForecast: 1848000, calcHrs: 16800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Substructure Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: s(420, 0, 63000), CTC: z(), F: s(4200, 0, 630000), Est: s(4200, 0, 630000), estVar: 0, comp: 10.0, prevForecast: 630000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '2Labor'), keyParts: ['C-200-', '2Labor'], label: 'Superstructure / Girder Erection', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 4800, 528000), Est: s(48, 4800, 528000), estVar: 0, comp: 0, prevForecast: 528000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-200-', '3Material'), keyParts: ['C-200-', '3Material'], label: 'Superstructure / Precast Girders', unitOfMeasure: 'EA', CTP: z(), CTD: z(), CTC: z(), F: s(48, 0, 7200000), Est: s(48, 0, 7200000), estVar: 0, comp: 0, prevForecast: 7200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Bridge Deck', unitOfMeasure: 'SF', CTP: z(), CTD: z(), CTC: z(), F: s(42000, 12600, 1386000), Est: s(42000, 12600, 1386000), estVar: 0, comp: 0, prevForecast: 1386000, calcHrs: 12600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Approach Roadwork', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.04, 0, 328000), CTC: z(), F: s(1, 0, 8400000), Est: s(1, 0, 8200000), estVar: 200000, comp: 3.9, prevForecast: 8200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Project Overhead', unitOfMeasure: 'MO', CTP: s(2, 0, 64000), CTD: s(3, 0, 96000), CTC: z(), F: s(30, 0, 960000), Est: s(30, 0, 960000), estVar: 0, comp: 10.0, prevForecast: 960000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Project Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(2, 0, 144000), CTD: s(3, 0, 216000), CTC: z(), F: s(30, 0, 2160000), Est: s(30, 0, 2160000), estVar: 0, comp: 10.0, prevForecast: 2160000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Project 4: Magnolia Crossing Site Development — Trushit Vaishnav, $15M, 5 versions
// ---------------------------------------------------------------------------

const MAGNOLIA: Partial<ProjectionProject> = {
  id: 'demo-magnolia',
  name: 'Magnolia Crossing Site Dev',
  jobNumber: '25803',
  customer: 'Gulf Coast Communities',
  pm: 'Trushit Vaishnav',
  createdAt: '2025-08-01T00:00:00.000Z',
  draft: null,
  comments: {
    [makeLineKey('B-100-', '2Labor')]: [
      { id: 'mc1', author: 'Trushit Vaishnav', text: 'Clearing complete ahead of schedule. Topsoil stockpile relocated per revised grading plan.', createdAt: '2025-09-20T10:00:00Z', versionLabel: 'September 2025 Projection' },
    ],
    [makeLineKey('C-100-', '5SubCont')]: [
      { id: 'mc2', author: 'Trushit Vaishnav', text: 'Retention pond liner spec upgraded to HDPE 60mil per county requirement. Cost impact $42k.', createdAt: '2025-11-15T14:00:00Z', versionLabel: 'November 2025 Projection' },
    ],
  },
  alertStatus: {},
  financials: {
    months: [
      { date: '2025-08-01', revenue: 15200000, cost: 13300000, profit: 1900000, gpPct: 12.5 },
      { date: '2025-09-01', revenue: 15200000, cost: 13400000, profit: 1800000, gpPct: 11.8 },
      { date: '2025-10-01', revenue: 15200000, cost: 13500000, profit: 1700000, gpPct: 11.2 },
      { date: '2025-11-01', revenue: 15400000, cost: 13700000, profit: 1700000, gpPct: 11.0 },
      { date: '2026-01-01', revenue: 15400000, cost: 13750000, profit: 1650000, gpPct: 10.7 },
    ],
    originalBid: { revenue: 15200000, cost: 13300000, profit: 1900000, gpPct: 12.5 },
  },
  versions: [
    {
      id: 'mag-v1', label: 'August 2025 Projection', createdAt: '2025-08-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Clearing & Grubbing', unitOfMeasure: 'AC', CTP: z(), CTD: s(4, 320, 28800), CTC: z(), F: s(42, 3360, 302400), Est: s(42, 3360, 302400), estVar: 0, comp: 9.5, prevForecast: 302400, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Mass Grading', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(120000, 4800, 480000), Est: s(120000, 4800, 480000), estVar: 0, comp: 0, prevForecast: 480000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Mass Grading', unitOfMeasure: 'MO', CTP: z(), CTD: z(), CTC: z(), F: s(8, 0, 192000), Est: s(8, 0, 192000), estVar: 0, comp: 0, prevForecast: 192000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Storm Water / Pipe Install', unitOfMeasure: 'LF', CTP: z(), CTD: z(), CTC: z(), F: s(8400, 3360, 336000), Est: s(8400, 3360, 336000), estVar: 0, comp: 0, prevForecast: 336000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Storm Water / Pipe & Fittings', unitOfMeasure: 'LF', CTP: z(), CTD: z(), CTC: z(), F: s(8400, 0, 504000), Est: s(8400, 0, 504000), estVar: 0, comp: 0, prevForecast: 504000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Retention Ponds', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 1200000), Est: s(1, 0, 1200000), estVar: 0, comp: 0, prevForecast: 1200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Road Construction', unitOfMeasure: 'SY', CTP: z(), CTD: z(), CTC: z(), F: s(24000, 4800, 432000), Est: s(24000, 4800, 432000), estVar: 0, comp: 0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Road Construction / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(9600, 0, 864000), Est: s(9600, 0, 864000), estVar: 0, comp: 0, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Utilities / Water & Sewer', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 2800000), Est: s(1, 0, 2800000), estVar: 0, comp: 0, prevForecast: 2800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 12000), CTC: z(), F: s(14, 0, 168000), Est: s(14, 0, 168000), estVar: 0, comp: 7.1, prevForecast: 168000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'mag-v2', label: 'September 2025 Projection', createdAt: '2025-09-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Clearing & Grubbing', unitOfMeasure: 'AC', CTP: s(4, 320, 28800), CTD: s(18, 1440, 129600), CTC: z(), F: s(42, 3360, 302400), Est: s(42, 3360, 302400), estVar: 0, comp: 42.9, prevForecast: 302400, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Mass Grading', unitOfMeasure: 'CY', CTP: z(), CTD: s(18000, 720, 72000), CTC: z(), F: s(120000, 4800, 480000), Est: s(120000, 4800, 480000), estVar: 0, comp: 15.0, prevForecast: 480000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Mass Grading', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 24000), CTC: z(), F: s(8, 0, 192000), Est: s(8, 0, 192000), estVar: 0, comp: 12.5, prevForecast: 192000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Storm Water / Pipe Install', unitOfMeasure: 'LF', CTP: z(), CTD: z(), CTC: z(), F: s(8400, 3360, 336000), Est: s(8400, 3360, 336000), estVar: 0, comp: 0, prevForecast: 336000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Storm Water / Pipe & Fittings', unitOfMeasure: 'LF', CTP: z(), CTD: z(), CTC: z(), F: s(8400, 0, 504000), Est: s(8400, 0, 504000), estVar: 0, comp: 0, prevForecast: 504000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Retention Ponds', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 1200000), Est: s(1, 0, 1200000), estVar: 0, comp: 0, prevForecast: 1200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Road Construction', unitOfMeasure: 'SY', CTP: z(), CTD: z(), CTC: z(), F: s(24000, 4800, 432000), Est: s(24000, 4800, 432000), estVar: 0, comp: 0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Road Construction / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(9600, 0, 864000), Est: s(9600, 0, 864000), estVar: 0, comp: 0, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Utilities / Water & Sewer', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 2800000), Est: s(1, 0, 2800000), estVar: 0, comp: 0, prevForecast: 2800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: s(1, 0, 12000), CTD: s(2, 0, 24000), CTC: z(), F: s(14, 0, 168000), Est: s(14, 0, 168000), estVar: 0, comp: 14.3, prevForecast: 168000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'mag-v3', label: 'October 2025 Projection', createdAt: '2025-10-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Clearing & Grubbing', unitOfMeasure: 'AC', CTP: s(18, 1440, 129600), CTD: s(38, 3040, 273600), CTC: z(), F: s(42, 3360, 310000), Est: s(42, 3360, 302400), estVar: 7600, comp: 88.2, prevForecast: 302400, calcHrs: 3360, wsRisk: 14000, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Mass Grading', unitOfMeasure: 'CY', CTP: s(18000, 720, 72000), CTD: s(54000, 2160, 216000), CTC: z(), F: s(120000, 4800, 480000), Est: s(120000, 4800, 480000), estVar: 0, comp: 45.0, prevForecast: 480000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Mass Grading', unitOfMeasure: 'MO', CTP: s(1, 0, 24000), CTD: s(3, 0, 72000), CTC: z(), F: s(8, 0, 192000), Est: s(8, 0, 192000), estVar: 0, comp: 37.5, prevForecast: 192000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Storm Water / Pipe Install', unitOfMeasure: 'LF', CTP: z(), CTD: s(1680, 672, 67200), CTC: z(), F: s(8400, 3360, 336000), Est: s(8400, 3360, 336000), estVar: 0, comp: 20.0, prevForecast: 336000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Storm Water / Pipe & Fittings', unitOfMeasure: 'LF', CTP: z(), CTD: s(1680, 0, 100800), CTC: z(), F: s(8400, 0, 504000), Est: s(8400, 0, 504000), estVar: 0, comp: 20.0, prevForecast: 504000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Retention Ponds', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.1, 0, 120000), CTC: z(), F: s(1, 0, 1200000), Est: s(1, 0, 1200000), estVar: 0, comp: 10.0, prevForecast: 1200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Road Construction', unitOfMeasure: 'SY', CTP: z(), CTD: z(), CTC: z(), F: s(24000, 4800, 432000), Est: s(24000, 4800, 432000), estVar: 0, comp: 0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Road Construction / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(9600, 0, 864000), Est: s(9600, 0, 864000), estVar: 0, comp: 0, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Utilities / Water & Sewer', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.05, 0, 140000), CTC: z(), F: s(1, 0, 2800000), Est: s(1, 0, 2800000), estVar: 0, comp: 5.0, prevForecast: 2800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: s(2, 0, 24000), CTD: s(3, 0, 36000), CTC: z(), F: s(14, 0, 168000), Est: s(14, 0, 168000), estVar: 0, comp: 21.4, prevForecast: 168000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'mag-v4', label: 'November 2025 Projection', createdAt: '2025-11-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Clearing & Grubbing', unitOfMeasure: 'AC', CTP: s(38, 3040, 273600), CTD: s(42, 3360, 308000), CTC: z(), F: s(42, 3360, 308000), Est: s(42, 3360, 302400), estVar: 5600, comp: 100, prevForecast: 310000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Mass Grading', unitOfMeasure: 'CY', CTP: s(54000, 2160, 216000), CTD: s(96000, 3840, 384000), CTC: z(), F: s(120000, 4800, 480000), Est: s(120000, 4800, 480000), estVar: 0, comp: 80.0, prevForecast: 480000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Mass Grading', unitOfMeasure: 'MO', CTP: s(3, 0, 72000), CTD: s(5, 0, 120000), CTC: z(), F: s(8, 0, 192000), Est: s(8, 0, 192000), estVar: 0, comp: 62.5, prevForecast: 192000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Storm Water / Pipe Install', unitOfMeasure: 'LF', CTP: s(1680, 672, 67200), CTD: s(4200, 1680, 168000), CTC: z(), F: s(8400, 3360, 336000), Est: s(8400, 3360, 336000), estVar: 0, comp: 50.0, prevForecast: 336000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '3Material'), keyParts: ['C-100-', '3Material'], label: 'Storm Water / Pipe & Fittings', unitOfMeasure: 'LF', CTP: s(1680, 0, 100800), CTD: s(4200, 0, 252000), CTC: z(), F: s(8400, 0, 504000), Est: s(8400, 0, 504000), estVar: 0, comp: 50.0, prevForecast: 504000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Retention Ponds', unitOfMeasure: 'LS', CTP: s(0.1, 0, 120000), CTD: s(0.35, 0, 434000), CTC: z(), F: s(1, 0, 1242000), Est: s(1, 0, 1200000), estVar: 42000, comp: 35.0, prevForecast: 1200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Road Construction', unitOfMeasure: 'SY', CTP: z(), CTD: s(4800, 960, 96000), CTC: z(), F: s(24000, 4800, 432000), Est: s(24000, 4800, 432000), estVar: 0, comp: 20.0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Road Construction / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(9600, 0, 864000), Est: s(9600, 0, 864000), estVar: 0, comp: 0, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Utilities / Water & Sewer', unitOfMeasure: 'LS', CTP: s(0.05, 0, 140000), CTD: s(0.2, 0, 560000), CTC: z(), F: s(1, 0, 2800000), Est: s(1, 0, 2800000), estVar: 0, comp: 20.0, prevForecast: 2800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: s(3, 0, 36000), CTD: s(4, 0, 48000), CTC: z(), F: s(14, 0, 168000), Est: s(14, 0, 168000), estVar: 0, comp: 28.6, prevForecast: 168000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'mag-v5', label: 'January 2026 Projection', createdAt: '2026-01-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Clearing & Grubbing', unitOfMeasure: 'AC', CTP: s(42, 3360, 308000), CTD: s(42, 3360, 308000), CTC: z(), F: s(42, 3360, 308000), Est: s(42, 3360, 302400), estVar: 5600, comp: 100, prevForecast: 308000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Mass Grading', unitOfMeasure: 'CY', CTP: s(96000, 3840, 384000), CTD: s(120000, 4800, 485000), CTC: z(), F: s(120000, 4800, 485000), Est: s(120000, 4800, 480000), estVar: 5000, comp: 100, prevForecast: 480000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '2Labor'), keyParts: ['C-100-', '2Labor'], label: 'Storm Water / Pipe Install', unitOfMeasure: 'LF', CTP: s(4200, 1680, 168000), CTD: s(6720, 2688, 268800), CTC: z(), F: s(8400, 3360, 336000), Est: s(8400, 3360, 336000), estVar: 0, comp: 80.0, prevForecast: 336000, calcHrs: 3360, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Retention Ponds', unitOfMeasure: 'LS', CTP: s(0.35, 0, 434000), CTD: s(0.7, 0, 869400), CTC: z(), F: s(1, 0, 1242000), Est: s(1, 0, 1200000), estVar: 42000, comp: 70.0, prevForecast: 1242000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Road Construction', unitOfMeasure: 'SY', CTP: s(4800, 960, 96000), CTD: s(14400, 2880, 288000), CTC: z(), F: s(24000, 4800, 432000), Est: s(24000, 4800, 432000), estVar: 0, comp: 60.0, prevForecast: 432000, calcHrs: 4800, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '5SubCont'), keyParts: ['D-100-', '5SubCont'], label: 'Road Construction / Paving', unitOfMeasure: 'TON', CTP: z(), CTD: s(2880, 0, 259200), CTC: z(), F: s(9600, 0, 864000), Est: s(9600, 0, 864000), estVar: 0, comp: 30.0, prevForecast: 864000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Utilities / Water & Sewer', unitOfMeasure: 'LS', CTP: s(0.2, 0, 560000), CTD: s(0.55, 0, 1540000), CTC: z(), F: s(1, 0, 2800000), Est: s(1, 0, 2800000), estVar: 0, comp: 55.0, prevForecast: 2800000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: s(4, 0, 48000), CTD: s(6, 0, 72000), CTC: z(), F: s(14, 0, 168000), Est: s(14, 0, 168000), estVar: 0, comp: 42.9, prevForecast: 168000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Project 5: Riverside Commerce Center — Juan P. Cardenas, $28M, 2 versions
// ---------------------------------------------------------------------------

const RIVERSIDE: Partial<ProjectionProject> = {
  id: 'demo-riverside',
  name: 'Riverside Commerce Center',
  jobNumber: '25824',
  customer: 'Coastal Commercial Partners',
  pm: 'Juan P. Cardenas',
  createdAt: '2026-02-01T00:00:00.000Z',
  draft: null,
  comments: {},
  alertStatus: {},
  financials: {
    months: [
      { date: '2026-02-01', revenue: 28400000, cost: 24900000, profit: 3500000, gpPct: 12.3 },
      { date: '2026-03-01', revenue: 28400000, cost: 25000000, profit: 3400000, gpPct: 12.0 },
    ],
    originalBid: { revenue: 28400000, cost: 24900000, profit: 3500000, gpPct: 12.3 },
  },
  versions: [
    {
      id: 'rv-v1', label: 'February 2026 Projection', createdAt: '2026-02-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Site Clearing', unitOfMeasure: 'AC', CTP: z(), CTD: s(3, 240, 21600), CTC: z(), F: s(18, 1440, 129600), Est: s(18, 1440, 129600), estVar: 0, comp: 16.7, prevForecast: 129600, calcHrs: 1440, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Grading & Earthwork', unitOfMeasure: 'CY', CTP: z(), CTD: s(8000, 640, 57600), CTC: z(), F: s(65000, 5200, 468000), Est: s(65000, 5200, 468000), estVar: 0, comp: 12.3, prevForecast: 468000, calcHrs: 5200, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Grading', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 32000), CTC: z(), F: s(10, 0, 320000), Est: s(10, 0, 320000), estVar: 0, comp: 10.0, prevForecast: 320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utilities / Underground', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 3200000), Est: s(1, 0, 3200000), estVar: 0, comp: 0, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Concrete / Foundations', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(2400, 9600, 960000), Est: s(2400, 9600, 960000), estVar: 0, comp: 0, prevForecast: 960000, calcHrs: 9600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '3Material'), keyParts: ['D-100-', '3Material'], label: 'Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: z(), CTC: z(), F: s(2400, 0, 360000), Est: s(2400, 0, 360000), estVar: 0, comp: 0, prevForecast: 360000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(14000, 0, 1260000), Est: s(14000, 0, 1260000), estVar: 0, comp: 0, prevForecast: 1260000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-200-', '5SubCont'), keyParts: ['E-200-', '5SubCont'], label: 'Landscaping', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 680000), Est: s(1, 0, 680000), estVar: 0, comp: 0, prevForecast: 680000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 14000), CTC: z(), F: s(16, 0, 224000), Est: s(16, 0, 224000), estVar: 0, comp: 6.3, prevForecast: 224000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: z(), CTD: s(1, 0, 38000), CTC: z(), F: s(16, 0, 608000), Est: s(16, 0, 608000), estVar: 0, comp: 6.3, prevForecast: 608000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
    {
      id: 'rv-v2', label: 'March 2026 Projection', createdAt: '2026-03-15T00:00:00Z', saved: true,
      items: [
        { lineKey: makeLineKey('B-100-', '2Labor'), keyParts: ['B-100-', '2Labor'], label: 'Site Clearing', unitOfMeasure: 'AC', CTP: s(3, 240, 21600), CTD: s(10, 800, 72000), CTC: z(), F: s(18, 1440, 129600), Est: s(18, 1440, 129600), estVar: 0, comp: 55.6, prevForecast: 129600, calcHrs: 1440, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '2Labor'), keyParts: ['B-200-', '2Labor'], label: 'Grading & Earthwork', unitOfMeasure: 'CY', CTP: s(8000, 640, 57600), CTD: s(22000, 1760, 158400), CTC: z(), F: s(65000, 5200, 468000), Est: s(65000, 5200, 468000), estVar: 0, comp: 33.8, prevForecast: 468000, calcHrs: 5200, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('B-200-', '4Rental'), keyParts: ['B-200-', '4Rental'], label: 'Grading', unitOfMeasure: 'MO', CTP: s(1, 0, 32000), CTD: s(2, 0, 64000), CTC: z(), F: s(10, 0, 320000), Est: s(10, 0, 320000), estVar: 0, comp: 20.0, prevForecast: 320000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('C-100-', '5SubCont'), keyParts: ['C-100-', '5SubCont'], label: 'Utilities / Underground', unitOfMeasure: 'LS', CTP: z(), CTD: s(0.05, 0, 160000), CTC: z(), F: s(1, 0, 3280000), Est: s(1, 0, 3200000), estVar: 80000, comp: 4.9, prevForecast: 3200000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '2Labor'), keyParts: ['D-100-', '2Labor'], label: 'Concrete / Foundations', unitOfMeasure: 'CY', CTP: z(), CTD: s(120, 480, 48000), CTC: z(), F: s(2400, 9600, 960000), Est: s(2400, 9600, 960000), estVar: 0, comp: 5.0, prevForecast: 960000, calcHrs: 9600, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('D-100-', '3Material'), keyParts: ['D-100-', '3Material'], label: 'Concrete', unitOfMeasure: 'CY', CTP: z(), CTD: s(120, 0, 18000), CTC: z(), F: s(2400, 0, 360000), Est: s(2400, 0, 360000), estVar: 0, comp: 5.0, prevForecast: 360000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-100-', '5SubCont'), keyParts: ['E-100-', '5SubCont'], label: 'Paving', unitOfMeasure: 'TON', CTP: z(), CTD: z(), CTC: z(), F: s(14000, 0, 1260000), Est: s(14000, 0, 1260000), estVar: 0, comp: 0, prevForecast: 1260000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('E-200-', '5SubCont'), keyParts: ['E-200-', '5SubCont'], label: 'Landscaping', unitOfMeasure: 'LS', CTP: z(), CTD: z(), CTC: z(), F: s(1, 0, 680000), Est: s(1, 0, 680000), estVar: 0, comp: 0, prevForecast: 680000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '9Owned'), keyParts: ['F-100-', '9Owned'], label: 'Overhead', unitOfMeasure: 'MO', CTP: s(1, 0, 14000), CTD: s(2, 0, 28000), CTC: z(), F: s(16, 0, 224000), Est: s(16, 0, 224000), estVar: 0, comp: 12.5, prevForecast: 224000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
        { lineKey: makeLineKey('F-100-', '6OtherJC'), keyParts: ['F-100-', '6OtherJC'], label: 'Overhead / Insurance & Bonds', unitOfMeasure: 'MO', CTP: s(1, 0, 38000), CTD: s(2, 0, 76000), CTC: z(), F: s(16, 0, 608000), Est: s(16, 0, 608000), estVar: 0, comp: 12.5, prevForecast: 608000, calcHrs: 0, wsRisk: 0, isNew: false, stale: false },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Build loaded projects
// ---------------------------------------------------------------------------

const RAW_PROJECTS = [SUNCOAST_3A, BAYSHORE, PALM_HARBOR, MAGNOLIA, RIVERSIDE];

export const DEMO_PROJECTION_PROJECTS: ProjectionProject[] = RAW_PROJECTS.map(
  (raw) => loadProject(raw)!
);

// ---------------------------------------------------------------------------
// Demo bids (one per project, all accepted)
// ---------------------------------------------------------------------------

export const DEMO_BIDS: Bid[] = [
  { id: 'demo-bid-sc3a', customerId: "Florida's Turnpike Enterprise", version: 1, isActive: true, status: 'accepted', createdDate: '2025-08-01', acceptedDate: '2025-08-15', salesperson: 'Nora Beckett', services: [{ id: 'dbs-1', catalogItemId: 'demo-mot', rate: 562804 }, { id: 'dbs-2', catalogItemId: 'demo-earthwork', rate: 8289120 }, { id: 'dbs-3', catalogItemId: 'demo-concrete', rate: 4620000 }, { id: 'dbs-4', catalogItemId: 'demo-paving', rate: 14200000 }] },
  { id: 'demo-bid-bay', customerId: 'Suncoast Development Group', version: 1, isActive: true, status: 'accepted', createdDate: '2025-10-01', acceptedDate: '2025-10-20', salesperson: 'Nora Beckett', services: [{ id: 'dbs-5', catalogItemId: 'demo-mot', rate: 460800 }, { id: 'dbs-6', catalogItemId: 'demo-earthwork', rate: 2550000 }, { id: 'dbs-7', catalogItemId: 'demo-paving', rate: 4320000 }] },
  { id: 'demo-bid-ph', customerId: 'Palomar Properties', version: 1, isActive: true, status: 'accepted', createdDate: '2025-12-01', acceptedDate: '2025-12-20', salesperson: 'Jude Castillo', services: [{ id: 'dbs-8', catalogItemId: 'demo-bridge', rate: 7200000 }, { id: 'dbs-9', catalogItemId: 'demo-piles', rate: 3600000 }, { id: 'dbs-10', catalogItemId: 'demo-concrete', rate: 1848000 }] },
  { id: 'demo-bid-mag', customerId: 'Gulf Coast Communities', version: 1, isActive: true, status: 'accepted', createdDate: '2025-07-01', acceptedDate: '2025-07-20', salesperson: 'Nora Beckett', services: [{ id: 'dbs-11', catalogItemId: 'demo-clearing', rate: 302400 }, { id: 'dbs-12', catalogItemId: 'demo-earthwork', rate: 480000 }, { id: 'dbs-13', catalogItemId: 'demo-storm', rate: 1200000 }] },
  { id: 'demo-bid-rv', customerId: 'Coastal Commercial Partners', version: 1, isActive: true, status: 'accepted', createdDate: '2026-01-10', acceptedDate: '2026-01-25', salesperson: 'Jude Castillo', services: [{ id: 'dbs-14', catalogItemId: 'demo-earthwork', rate: 468000 }, { id: 'dbs-15', catalogItemId: 'demo-concrete', rate: 960000 }, { id: 'dbs-16', catalogItemId: 'demo-paving', rate: 1260000 }] },
];

// ---------------------------------------------------------------------------
// Demo invoices (spread across projects, various statuses)
// ---------------------------------------------------------------------------

export const DEMO_INVOICES: Invoice[] = [
  // Suncoast 3A — 4 invoices (oldest paid, middle sent, recent draft)
  { id: 'demo-inv-sc3a-1', invoiceNumber: 'INV-SC3A-001', projectId: 'demo-suncoast-3a', status: 'paid', rangeStart: '2025-09-01', rangeEnd: '2025-09-30', generatedDate: '2025-10-05', sentDate: '2025-10-08', paidDate: '2025-11-02', totalUsd: 4820000 },
  { id: 'demo-inv-sc3a-2', invoiceNumber: 'INV-SC3A-002', projectId: 'demo-suncoast-3a', status: 'paid', rangeStart: '2025-10-01', rangeEnd: '2025-10-31', generatedDate: '2025-11-05', sentDate: '2025-11-08', paidDate: '2025-12-04', totalUsd: 5340000 },
  { id: 'demo-inv-sc3a-3', invoiceNumber: 'INV-SC3A-003', projectId: 'demo-suncoast-3a', status: 'sent', rangeStart: '2025-11-01', rangeEnd: '2025-11-30', generatedDate: '2025-12-05', sentDate: '2025-12-09', totalUsd: 6120000 },
  { id: 'demo-inv-sc3a-4', invoiceNumber: 'INV-SC3A-004', projectId: 'demo-suncoast-3a', status: 'draft', rangeStart: '2025-12-01', rangeEnd: '2025-12-31', generatedDate: '2026-01-06', totalUsd: 7850000 },

  // Bayshore — 2 invoices
  { id: 'demo-inv-bay-1', invoiceNumber: 'INV-BAY-001', projectId: 'demo-bayshore', status: 'paid', rangeStart: '2025-11-01', rangeEnd: '2025-11-30', generatedDate: '2025-12-05', sentDate: '2025-12-08', paidDate: '2026-01-06', totalUsd: 1420000 },
  { id: 'demo-inv-bay-2', invoiceNumber: 'INV-BAY-002', projectId: 'demo-bayshore', status: 'sent', rangeStart: '2025-12-01', rangeEnd: '2025-12-31', generatedDate: '2026-01-06', sentDate: '2026-01-10', totalUsd: 1880000 },

  // Palm Harbor — 1 invoice
  { id: 'demo-inv-ph-1', invoiceNumber: 'INV-PH-001', projectId: 'demo-palm-harbor', status: 'sent', rangeStart: '2026-01-01', rangeEnd: '2026-01-31', generatedDate: '2026-02-04', sentDate: '2026-02-07', totalUsd: 2240000 },

  // Magnolia — 3 invoices (mature project)
  { id: 'demo-inv-mag-1', invoiceNumber: 'INV-MAG-001', projectId: 'demo-magnolia', status: 'paid', rangeStart: '2025-08-01', rangeEnd: '2025-08-31', generatedDate: '2025-09-04', sentDate: '2025-09-06', paidDate: '2025-10-01', totalUsd: 620000 },
  { id: 'demo-inv-mag-2', invoiceNumber: 'INV-MAG-002', projectId: 'demo-magnolia', status: 'paid', rangeStart: '2025-09-01', rangeEnd: '2025-09-30', generatedDate: '2025-10-04', sentDate: '2025-10-07', paidDate: '2025-11-03', totalUsd: 1180000 },
  { id: 'demo-inv-mag-3', invoiceNumber: 'INV-MAG-003', projectId: 'demo-magnolia', status: 'paid', rangeStart: '2025-10-01', rangeEnd: '2025-10-31', generatedDate: '2025-11-04', sentDate: '2025-11-07', paidDate: '2025-12-02', totalUsd: 1540000 },

  // Riverside — 1 draft
  { id: 'demo-inv-rv-1', invoiceNumber: 'INV-RV-001', projectId: 'demo-riverside', status: 'draft', rangeStart: '2026-02-01', rangeEnd: '2026-02-28', generatedDate: '2026-03-04', totalUsd: 890000 },
];

// ---------------------------------------------------------------------------
// Build service registry from demo projects
// ---------------------------------------------------------------------------

export function buildDemoRegistry(tenantId: string) {
  let reg = createRegistry(tenantId);
  const seen = new Set<string>();
  for (const proj of DEMO_PROJECTION_PROJECTS) {
    const latest = proj.versions[proj.versions.length - 1];
    if (!latest) continue;
    for (const item of latest.items) {
      const key = `${item.label}|${item.unitOfMeasure}`;
      if (seen.has(key)) continue;
      seen.add(key);
      reg = addServiceItem(reg, {
        canonicalName: item.label,
        unitOfMeasure: item.unitOfMeasure,
        costType: item.keyParts[1] || '',
        sourceProjectId: proj.id,
      });
    }
  }
  return reg;
}
