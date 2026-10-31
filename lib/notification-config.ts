export function notificationConfigMissing(env: Record<string,string|undefined>) {
  const missing=['RESEND_API_KEY','NOTIFICATION_FROM_EMAIL','NOTIFICATION_UNSUBSCRIBE_SECRET'].filter(key=>!env[key]?.trim())
  try {
    const url=new URL(env.APP_BASE_URL ?? '')
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)missing.push('APP_BASE_URL')
  } catch {missing.push('APP_BASE_URL')}
  return missing
}
