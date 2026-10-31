import { z } from "zod";
import { phoneSchema } from "./phone.schema";

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .regex(/\p{L}/u, "Ajoutez au moins une lettre.")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre.");
export const signupApiSchema = z.object({
  email: z.string().email("Email invalide"),
  password: passwordSchema,
  full_name: z.string().min(1, "Votre nom est requis").max(100),
  phone: phoneSchema,
  organization_name: z
    .string()
    .min(1, "Le nom de la boutique est requis")
    .max(120),
});
export const signupSchema = signupApiSchema
  .extend({ confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les deux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });
