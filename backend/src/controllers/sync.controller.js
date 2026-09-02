import * as syncService from '../services/sync.service.js';

export const syncBatch = async (req, res) => {
  const result = await syncService.processSyncBatch(req.body.records);

  res.status(200).json({
    success: true,
    data: result,
  });
};
