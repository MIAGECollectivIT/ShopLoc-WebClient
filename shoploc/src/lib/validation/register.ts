import * as Yup from 'yup';
import { z } from 'zod';

export const MINIMUM_AGE = 18;

// RFC 5322 compliant regex for strict email format validation
export const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const PASSWORD_SPECIAL_CHARS_REGEX = /[@$!%*?&#^()_+\-=]/;

export interface PasswordRequirement {
  id: 'length' | 'lowercase' | 'uppercase' | 'digit' | 'special';
  label: string;
  met: boolean;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function calculateAge(birthDateString: string, referenceDate: Date = new Date()): number {
  if (!birthDateString) return 0;
  const parts = birthDateString.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return 0;
  const [year, month, day] = parts;

  let age = referenceDate.getFullYear() - year;
  const monthDiff = referenceDate.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < day)) {
    age--;
  }
  return age;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'Au moins 8 caractères',
      met: password.length >= 8,
    },
    {
      id: 'lowercase',
      label: 'Au moins une lettre minuscule (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'uppercase',
      label: 'Au moins une lettre majuscule (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'digit',
      label: 'Au moins un chiffre (0-9)',
      met: /\d/.test(password),
    },
    {
      id: 'special',
      label: 'Au moins un caractère spécial (@$!%*?&#^()_+-=)',
      met: PASSWORD_SPECIAL_CHARS_REGEX.test(password),
    },
  ];
}

export function calculatePasswordStrength(requirements: PasswordRequirement[]): PasswordStrength {
  const metCount = requirements.filter((r) => r.met).length;
  if (metCount <= 2) return 'weak';
  if (metCount <= 4) return 'medium';
  return 'strong';
}

// Yup validation schema tailored for Formik real-time validation
export const registerValidationSchema = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .required('Le prénom est obligatoire')
    .max(100, 'Le prénom ne doit pas dépasser 100 caractères'),
  lastName: Yup.string()
    .trim()
    .required('Le nom est obligatoire')
    .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
  birthDate: Yup.string()
    .required('La date de naissance est obligatoire')
    .test('is-in-past', 'La date de naissance doit être dans le passé', (val) => {
      if (!val) return false;
      const date = new Date(val);
      return !isNaN(date.getTime()) && date < new Date();
    })
    .test(
      'is-min-age',
      `Vous devez avoir au moins ${MINIMUM_AGE} ans pour créer un compte`,
      (val) => {
        if (!val) return false;
        return calculateAge(val) >= MINIMUM_AGE;
      }
    ),
  email: Yup.string()
    .trim()
    .required("L'adresse email est obligatoire")
    .max(255, "L'adresse email ne doit pas dépasser 255 caractères")
    .matches(RFC_5322_EMAIL_REGEX, "Format d'adresse email invalide (ex: nom@domaine.fr)"),
  password: Yup.string()
    .required('Le mot de passe est obligatoire')
    .min(8, 'Le mot de passe doit comporter au moins 8 caractères')
    .max(100, 'Le mot de passe ne doit pas dépasser 100 caractères')
    .matches(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .matches(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
    .matches(
      PASSWORD_SPECIAL_CHARS_REGEX,
      'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&#^()_+-=)'
    ),
  confirmPassword: Yup.string()
    .required('La confirmation du mot de passe est obligatoire')
    .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas'),
  pickupLocation: Yup.string()
    .required('Le lieu de retrait de carte physique est obligatoire')
    .max(150, 'Le lieu de retrait ne doit pas dépasser 150 caractères'),
});

// Zod validation schema matching the backend constraints
export const registerZodSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, 'Le prénom est obligatoire')
      .max(100, 'Le prénom ne doit pas dépasser 100 caractères'),
    lastName: z
      .string()
      .trim()
      .min(1, 'Le nom est obligatoire')
      .max(100, 'Le nom ne doit pas dépasser 100 caractères'),
    birthDate: z
      .string()
      .min(1, 'La date de naissance est obligatoire')
      .refine(
        (val) => {
          const date = new Date(val);
          return !isNaN(date.getTime()) && date < new Date();
        },
        { message: 'La date de naissance doit être dans le passé' }
      )
      .refine((val) => calculateAge(val) >= MINIMUM_AGE, {
        message: `Vous devez avoir au moins ${MINIMUM_AGE} ans pour créer un compte`,
      }),
    email: z
      .string()
      .trim()
      .min(1, "L'adresse email est obligatoire")
      .max(255, "L'adresse email ne doit pas dépasser 255 caractères")
      .regex(RFC_5322_EMAIL_REGEX, "Format d'adresse email invalide (ex: nom@domaine.fr)"),
    password: z
      .string()
      .min(8, 'Le mot de passe doit comporter au moins 8 caractères')
      .max(100, 'Le mot de passe ne doit pas dépasser 100 caractères')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
      .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
      .regex(
        PASSWORD_SPECIAL_CHARS_REGEX,
        'Le mot de passe doit contenir au moins un caractère spécial (@$!%*?&#^()_+-=)'
      ),
    confirmPassword: z.string().min(1, 'La confirmation du mot de passe est obligatoire'),
    pickupLocation: z
      .string()
      .min(1, 'Le lieu de retrait de carte physique est obligatoire')
      .max(150, 'Le lieu de retrait ne doit pas dépasser 150 caractères'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

export type RegisterFormData = Yup.InferType<typeof registerValidationSchema>;
