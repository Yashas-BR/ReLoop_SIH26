import express from 'express';
import valuationRoute from './valuation.route.js';
import recyclerRoute from './recycler.route.js';
import priceRoute from './price.route.js';
import handoverRoute from './handover.route.js';
import anomalyRoute from './anomaly.route.js';
import syncRoute from './sync.route.js';
import paymentRoute from './payment.route.js';
import priceIngestRoute from './priceIngest.route.js';
import collectorsRoute from './collectors.route.js';
import offersRoute from './offers.route.js';
import adminRoute from './admin.route.js';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/valuation',
    route: valuationRoute,
  },
  {
    path: '/recyclers',
    route: recyclerRoute,
  },
  {
    path: '/prices',
    route: priceRoute,
  },
  {
    path: '/handover',
    route: handoverRoute,
  },
  {
    path: '/anomaly',
    route: anomalyRoute,
  },
  {
    path: '/sync',
    route: syncRoute,
  },
  {
    path: '/payments',
    route: paymentRoute,
  },
  {
    path: '/prices/ingest',
    route: priceIngestRoute,
  },
  {
    path: '/collectors',
    route: collectorsRoute,
  },
  {
    path: '/quotes',
    route: offersRoute,
  },
  {
    path: '/admin',
    route: adminRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// A simple health-check endpoint
router.get('/health', (req, res) => {
  res.status(200).send({ status: 'UP' });
});

export default router;
