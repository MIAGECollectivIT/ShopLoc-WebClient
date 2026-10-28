import * as Yup from 'yup';
import { RFC_5322_EMAIL_REGEX } from './register';

export const loginValidationSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .required("L'adresse email est obligatoire")
    .matches(RFC_5322_EMAIL_REGEX, "Format d'adresse email invalide (ex: nom@domaine.fr)"),
  password: Yup.string().required('Le mot de passe est obligatoire'),
});

export type LoginFormData = Yup.InferType<typeof loginValidationSchema>;
