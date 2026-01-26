import type { Request, RequestHandler, Response } from "express";

import { fileTransferService } from "@/api/fileTransfer/fileTransferService";

class FileTransferController {
	public uploadFile: RequestHandler = async (req: Request, res: Response) => {
		const file = req.file;
		if (!file) {
			return res.status(400).send({
				success: false,
				message: "No file uploaded",
				responseObject: null,
				statusCode: 400,
			});
		}

		const serviceResponse = await fileTransferService.uploadFile(file);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};
}

export const fileTransferController = new FileTransferController();
