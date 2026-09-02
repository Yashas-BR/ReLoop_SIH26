import * as anomalyService from '../services/anomaly.service.js';

export const checkTransaction = async (req, res) => {
  const result = await anomalyService.checkTransactionAnomaly(req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getAnomalies = async (req, res) => {
  const result = await anomalyService.getAnomalies(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
};
