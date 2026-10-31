export function passwordStrength(password: string) {
  const minimum = password.length >= 8
  const mixed = /\p{L}/u.test(password) && /[0-9]/.test(password)
  const recommended = /[^\p{L}\p{N}\s]/u.test(password) || password.length >= 12
  const score = !minimum ? 0 : !mixed ? 1 : recommended ? 3 : 2
  return { score, minimum, mixed, recommended, label: ['Trop court', 'Faible', 'Correct', 'Solide'][score] }
}
