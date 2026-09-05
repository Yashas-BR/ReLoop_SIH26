import * as collectorService from '../services/collectors.service.js';

export const getCollectors = async (req, res) => {
  const data = await collectorService.getCollectors();

  res.status(200).json({ success: true, count: data.length, data });
};

export const login = async (req, res) => {
  const { phone } = req.body;
  const data = await collectorService.loginCollector(phone);

  res.status(200).json({ success: true, data });
};