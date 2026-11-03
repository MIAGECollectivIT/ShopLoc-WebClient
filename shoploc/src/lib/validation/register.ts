import * as Yup from 'yup';
import { z } from 'zod';

export const MINIMUM_AGE = 18;
export const MINIMUM_PASSWORD_LENGTH = 12;

// RFC 5322 compliant regex for strict email format validation
export const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Permissive special character pattern (CNIL compliant: non-alphanumeric character)
export const PASSWORD_SPECIAL_CHARS_REGEX = /[^a-zA-Z0-9]/;

export interface PasswordRequirement {
  id: 'length' | 'lowercase' | 'uppercase' | 'digit' | 'special' | 'personal';
  label: string;
  met: boolean;
}

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface UserPersonalContext {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export function hasPersonalInfo(password: string, userInfo?: UserPersonalContext): boolean {
  if (!password || !userInfo) return false;
  const lower = password.toLowerCase();

  if (userInfo.firstName && userInfo.firstName.trim().length >= 3) {
    if (lower.includes(userInfo.firstName.trim().toLowerCase())) return true;
  }
  if (userInfo.lastName && userInfo.lastName.trim().length >= 3) {
    if (lower.includes(userInfo.lastName.trim().toLowerCase())) return true;
  }
  if (userInfo.email && userInfo.email.includes('@')) {
    const localPart = userInfo.email.split('@')[0].trim().toLowerCase();
    if (localPart.length >= 3 && lower.includes(localPart)) return true;
  }
  return false;
}

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

export function getPasswordRequirements(
  password: string,
  userInfo?: UserPersonalContext
): PasswordRequirement[] {
  return [
    {
      id: 'length',
      label: 'Au moins 12 caractères (recommandation CNIL)',
      met: password.length >= MINIMUM_PASSWORD_LENGTH,
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
      label: 'Au moins un caractère spécial (!@#$%^&*...)',
      met: PASSWORD_SPECIAL_CHARS_REGEX.test(password),
    },
    {
      id: 'personal',
      label: 'Ne contient ni prénom, ni nom, ni email',
      met: !hasPersonalInfo(password, userInfo),
    },
  ];
}

export function calculatePasswordStrength(requirements: PasswordRequirement[]): PasswordStrength {
  const lengthMet = requirements.find((r) => r.id === 'length')?.met ?? false;
  const metCount = requirements.filter((r) => r.met).length;

  if (!lengthMet || metCount <= 3) {
    return 'weak';
  }
  if (metCount <= 5) {
    return 'medium';
  }
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
    .min(
      MINIMUM_PASSWORD_LENGTH,
      `Le mot de passe doit comporter au moins ${MINIMUM_PASSWORD_LENGTH} caractères (recommandation CNIL)`
    )
    .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères')
    .matches(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
    .matches(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
    .matches(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
    .matches(
      PASSWORD_SPECIAL_CHARS_REGEX,
      'Le mot de passe doit contenir au moins un caractère spécial'
    )
    .test(
      'no-personal-info',
      'Le mot de passe ne doit pas contenir votre prénom, votre nom ou votre adresse email',
      function (val) {
        if (!val) return true;
        const { firstName, lastName, email } = this.parent;
        return !hasPersonalInfo(val, { firstName, lastName, email });
      }
    ),
  confirmPassword: Yup.string()
    .required('La confirmation du mot de passe est obligatoire')
    .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas'),
  wantsPhysicalCard: Yup.boolean().default(false),
  pickupLocation: Yup.string().when('wantsPhysicalCard', {
    is: true,
    then: (schema) =>
      schema
        .required('Veuillez sélectionner un point de retrait pour votre carte physique')
        .max(150, 'Le lieu de retrait ne doit pas dépasser 150 caractères'),
    otherwise: (schema) => schema.notRequired(),
  }),
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
      .min(
        MINIMUM_PASSWORD_LENGTH,
        `Le mot de passe doit comporter au moins ${MINIMUM_PASSWORD_LENGTH} caractères (recommandation CNIL)`
      )
      .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une lettre minuscule')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une lettre majuscule')
      .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre')
      .regex(
        PASSWORD_SPECIAL_CHARS_REGEX,
        'Le mot de passe doit contenir au moins un caractère spécial'
      ),
    confirmPassword: z.string().min(1, 'La confirmation du mot de passe est obligatoire'),
    wantsPhysicalCard: z.boolean().default(false),
    pickupLocation: z
      .string()
      .max(150, 'Le lieu de retrait ne doit pas dépasser 150 caractères')
      .optional()
      .nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })
  .refine(
    (data) =>
      !hasPersonalInfo(data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
      }),
    {
      message:
        'Le mot de passe ne doit pas contenir votre prénom, votre nom ou votre adresse email',
      path: ['password'],
    }
  )
  .refine(
    (data) =>
      !data.wantsPhysicalCard ||
      (typeof data.pickupLocation === 'string' && data.pickupLocation.trim().length > 0),
    {
      message: 'Veuillez sélectionner un point de retrait pour votre carte physique',
      path: ['pickupLocation'],
    }
  );

export type RegisterFormData = Yup.InferType<typeof registerValidationSchema>;
