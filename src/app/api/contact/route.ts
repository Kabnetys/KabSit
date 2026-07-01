import { NextRequest, NextResponse } from 'next/server';

interface ContactPayload {
  name: string;
  email: string;
  company: string;
  message: string;
  locale: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, company = '', message } = body as Partial<ContactPayload>;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 422 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 422 });
  }

  if (name.length > 100 || company.length > 100 || message.length > 2000 || email.length > 200) {
    return NextResponse.json({ error: 'Field too long' }, { status: 422 });
  }

  // Production: integrate Resend / SendGrid here with RESEND_API_KEY env var

  return NextResponse.json({ success: true }, { status: 200 });
}
