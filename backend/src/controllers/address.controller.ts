import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

// CustomerAddress CRUD (product-flow update §6/§8/§54) — the customer's
// reusable saved addresses. Deliberately separate from a booking's own
// service-address snapshot (see booking.controller.ts's createBooking).

export async function listAddresses(req: Request, res: Response) {
  const addresses = await prisma.customerAddress.findMany({
    where: { customerId: req.user!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json(addresses);
}

export async function createAddress(req: Request, res: Response) {
  const {
    label,
    line1,
    line2,
    landmark,
    pincode,
    latitude,
    longitude,
    contactName,
    contactPhone,
    isDefault,
  } = req.body ?? {};

  if (!label || !line1 || !pincode || typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({
      error: "label, line1, pincode, latitude and longitude are required",
    });
  }

  if (isDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId: req.user!.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      customerId: req.user!.id,
      label,
      line1,
      line2,
      landmark,
      pincode,
      latitude,
      longitude,
      contactName,
      contactPhone,
      isDefault: !!isDefault,
    },
  });
  res.status(201).json(address);
}

export async function deleteAddress(req: Request, res: Response) {
  const address = await prisma.customerAddress.findUnique({ where: { id: req.params.id } });
  if (!address || address.customerId !== req.user!.id) {
    return res.status(404).json({ error: "Address not found" });
  }
  await prisma.customerAddress.delete({ where: { id: address.id } });
  res.status(204).send();
}
