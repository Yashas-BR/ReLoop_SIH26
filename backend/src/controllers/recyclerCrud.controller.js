import * as recyclerCrudService from '../services/recyclerCrud.service.js';

export const createRecycler = async (req, res) => {
  const recycler = await recyclerCrudService.createRecycler(req.body);

  res.status(201).json({
    success: true,
    data: recycler,
  });
};

export const getRecycler = async (req, res) => {
  const recycler = await recyclerCrudService.getRecyclerById(req.params.id);

  res.status(200).json({
    success: true,
    data: recycler,
  });
};

export const listRecyclers = async (req, res) => {
  const result = await recyclerCrudService.listRecyclers(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
};

export const updateRecycler = async (req, res) => {
  const recycler = await recyclerCrudService.updateRecycler(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: recycler,
  });
};

export const deleteRecycler = async (req, res) => {
  await recyclerCrudService.deleteRecycler(req.params.id);

  res.status(204).send();
};
