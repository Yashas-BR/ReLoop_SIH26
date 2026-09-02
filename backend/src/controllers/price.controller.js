import * as priceService from '../services/price.service.js';

export const getPriceTrends = async (req, res) => {
  const { category, location, days } = req.query;

  const trends = await priceService.getPriceTrends(
    category,
    location,
    days
  );

  res.status(200).json({
    success: true,
    data: trends,
  });
};
