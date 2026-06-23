import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { inviteEmployeeSchema } from '@/lib/schemas/team.schema'
import { getTeamMembers, createTeamMember, deleteTeamMember, updateMemberRole } from '@/services/team-service'
import { z } from 'zod'

const memberMutationSchema = z.object({ id: z.string().uuid() })
const roleMutationSchema = memberMutationSchema.extend({ role: z.enum(['admin', 'employee']) })

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? { user, profile } : null
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const members = await getTeamMembers(auth.profile.organization_id)
    return NextResponse.json(members)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const parsed = inviteEmployeeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const member = await createTeamMember({
      ...parsed.data,
      organization_id: auth.profile.organization_id,
    })
    return NextResponse.json(member, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = memberMutationSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  const { id } = parsed.data
  if (id === auth.user.id) return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })

  try {
    await deleteTeamMember(id, auth.profile.organization_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const parsed = roleMutationSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const { id, role } = parsed.data
  if (id === auth.user.id && role !== 'admin') return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle administrateur' }, { status: 400 })

  try {
    await updateMemberRole(id, role, auth.profile.organization_id)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
