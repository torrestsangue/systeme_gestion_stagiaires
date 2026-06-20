    import { Router } from "express";
    import { createContact } from "../controllers/Contact.controllers";

    const router = Router();


    router.post("/contacts", createContact);

    export default router;