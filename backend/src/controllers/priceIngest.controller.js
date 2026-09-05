import * as priceIngestService from '../services/priceIngest.service.js';

export const bulkUpsertPrices = async (req, res) => {
  const result = await priceIngestService.bulkUpsertPrices(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getRecyclerRates = async (req, res) => {
  const result = await priceIngestService.getRecyclerRates(req.params.recyclerId);

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
};

export const getRecyclerRateBoard = async (req, res) => {
  const { category, location } = req.query;
  const result = await priceIngestService.getRecyclerRateBoard({ category, location });

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
};
