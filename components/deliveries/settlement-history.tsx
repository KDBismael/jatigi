'use client'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { DeliverySettlement } from '@/types/delivery-driver'
export function SettlementHistory({ driverId, refresh = 0 }: { driverId: string; refresh?: number }) {
 const [rows,setRows]=useState<DeliverySettlement[]>([])
 const [error,setError]=useState('')
 useEffect(()=>{let active=true;fetch(`/api/delivery-drivers/${driverId}/settlements`).then(async r=>{if(!r.ok)throw new Error();return r.json()}).then(data=>{if(active){setRows(data);setError('')}}).catch(()=>{if(active)setError('Historique indisponible')});return()=>{active=false}},[driverId,refresh])
 return <section className="mt-4 border-t pt-3"><h3 className="font-medium">Historique des reversements</h3>{error?<p role="alert">{error}</p>:rows.length===0?<p className="text-sm text-gray-500">Aucun reversement enregistré.</p>:<ul className="divide-y">{rows.map(row=><li key={row.id} className="py-2 text-sm flex flex-wrap justify-between gap-2"><span>{row.settled_at} · {row.recorder?.full_name ?? 'Utilisateur archivé'}</span><strong>{formatCurrency(Number(row.amount))}</strong>{row.note&&<p className="w-full text-gray-500">{row.note}</p>}</li>)}</ul>}</section>
}
