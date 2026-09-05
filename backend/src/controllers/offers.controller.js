import * as offersService from '../services/offers.service.js';

export const requestQuote = async (req, res) => {
  const data = await offersService.requestQuote(req.body);

  res.status(201).json({ success: true, data });
};

export const sendOffer = async (req, res) => {
  const data = await offersService.sendOffer(req.body);

  res.status(201).json({ success: true, data });
};

export const respondToOffer = async (req, res) => {
  const data = await offersService.respondToOffer(req.params.id, req.body);

  res.status(200).json({ success: true, data });
};

export const acceptOffer = async (req, res) => {
  const data = await offersService.acceptOffer(req.params.id);

  res.status(200).json({ success: true, data });
};

export const rejectOffer = async (req, res) => {
  const data = await offersService.rejectOffer(req.params.id);

  res.status(200).json({ success: true, data });
};

export const getOffersByLot = async (req, res) => {
  const data = await offersService.getOffersByLot(req.params.lotId);

  res.status(200).json({ success: true, count: data.length, data });
};

export const getAvailableLots = async (req, res) => {
  const data = await offersService.getAvailableLots(req.query.recycler_id);

  res.status(200).json({ success: true, count: data.length, data });
};