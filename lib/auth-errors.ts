// Maps Supabase auth error messages (English) to French for display.

const EXACT: Record<string, string> = {
  'Invalid login credentials': 'Identifiants invalides. Vérifiez votre email et votre mot de passe.',
  'Email not confirmed': "Votre email n'a pas encore été confirmé.",
  'User already registered': 'Un compte existe déjà avec cet email.',
  'New password should be different from the old password.':
    "Le nouveau mot de passe doit être différent de l'ancien.",
  'Password should be at least 6 characters.':
    'Le mot de passe doit contenir au moins 6 caractères.',
  'Email rate limit exceeded': "Trop de tentatives. Réessayez dans quelques minutes.",
  'For security purposes, you can only request this after 60 seconds.':
    'Pour des raisons de sécurité, veuillez patienter 60 secondes avant de réessayer.',
  'Auth session missing!': 'Session expirée. Veuillez recommencer.',
  'Token has expired or is invalid':
    'Le lien a expiré ou est invalide. Veuillez en demander un nouveau.',
  'Unable to validate email address: invalid format':
    "Le format de l'adresse email est invalide.",
  'Signup requires a valid password': 'Un mot de passe valide est requis.',
  'User not found': 'Aucun compte trouvé.',
}

// Substring fallbacks for messages that vary slightly.
const PARTIAL: [RegExp, string][] = [
  [/different from the old password/i, "Le nouveau mot de passe doit être différent de l'ancien."],
  [/at least (\d+) characters/i, 'Le mot de passe doit contenir au moins $1 caractères.'],
  [/invalid login credentials/i, 'Identifiants invalides. Vérifiez votre email et votre mot de passe.'],
  [/rate limit/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
  [/expired or is invalid/i, 'Le lien a expiré ou est invalide. Veuillez en demander un nouveau.'],
  [/network|fetch failed/i, 'Problème de connexion. Vérifiez votre réseau et réessayez.'],
]

export function translateAuthError(message: string | undefined | null): string {
  if (!message) return 'Une erreur est survenue. Veuillez réessayer.'
  if (EXACT[message]) return EXACT[message]
  for (const [pattern, fr] of PARTIAL) {
    if (pattern.test(message)) return message.replace(pattern, fr)
  }
  return message
}
