import * as paymentService from '../services/payment.service.js';

export const updatePayment = async (req, res) => {
  const result = await paymentService.updatePaymentStatus(req.params.lotId, req.body);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getEarnings = async (req, res) => {
  const result = await paymentService.getEarningsSummary(req.params.collectorId);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getPaymentHistory = async (req, res) => {
  const result = await paymentService.getPaymentHistory(req.params.collectorId);

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
};
