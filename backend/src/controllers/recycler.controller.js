import * as recyclerService from '../services/recycler.service.js';

export const getMatchedRecyclers = async (req, res) => {
  const { category, lat, lng, maxDistanceKm } = req.query;

  const recyclers = await recyclerService.matchAuthorizedRecyclers(
    category,
    lat,
    lng,
    maxDistanceKm
  );

  res.status(200).json({
    success: true,
    count: recyclers.length,
    data: recyclers,
  });
};
