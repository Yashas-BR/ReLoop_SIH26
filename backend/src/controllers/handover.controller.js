import * as handoverService from '../services/handover.service.js';

export const createLot = async (req, res) => {
  const result = await handoverService.createLot(req.body);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const initiateHandover = async (req, res) => {
  const result = await handoverService.initiateHandover(req.body);

  res.status(201).json({
    success: true,
    data: result,
  });
};

export const confirmHandover = async (req, res) => {
  const result = await handoverService.confirmHandover(
    req.params.reference,
    req.body.recycler_id
  );

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getHandover = async (req, res) => {
  const result = await handoverService.getHandoverByReference(req.params.reference);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const getHandoversByLot = async (req, res) => {
  const result = await handoverService.getHandoversByLot(req.params.lotId);

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
};

export const getLotsByCollector = async (req, res) => {
  const result = await handoverService.getLotsByCollector(req.params.collectorId);

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
};
