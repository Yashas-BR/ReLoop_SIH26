import * as valuationService from '../services/valuation.service.js';

export const getInstantValuation = async (req, res) => {
  const { category, location, weight } = req.query;
  
  const valuation = await valuationService.calculateInstantValuation(
    category, 
    location, 
    weight
  );

  res.status(200).json({
    success: true,
    data: valuation,
  });
};
