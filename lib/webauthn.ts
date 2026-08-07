import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

const RP_NAME = 'Manyazewal Eshetu Gibi';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID
  || (process.env.NEXT_PUBLIC_BASE_URL
    ? new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname
    : 'localhost');
const ORIGIN = (process.env.NEXT_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export function getRelyingParty() {
  return { rpName: RP_NAME, rpID: RP_ID, origin: ORIGIN };
}

export async function getCredentialsByUserId(userId: string) {
  return prisma.webAuthnCredential.findMany({ where: { userId } });
}

export async function getCredentialById(credentialId: string) {
  return prisma.webAuthnCredential.findFirst({ where: { credentialId } });
}

export async function saveCredential(userId: string, credential: any) {
  await prisma.webAuthnCredential.create({
    data: {
      id: randomUUID(),
      userId,
      credentialId: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports || [],
      deviceName: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function updateCredentialCounter(credentialId: string, counter: number) {
  await prisma.webAuthnCredential.updateMany({
    where: { credentialId },
    data: { counter, updatedAt: new Date() },
  });
}

export async function createRegistrationOptions(userId: string, userName: string) {
  const { rpName, rpID, origin } = getRelyingParty();
  const existingCredentials = await getCredentialsByUserId(userId);
  const excludeCredentials = existingCredentials.map((cred: any) => ({
    id: cred.credentialId,
    type: 'public-key' as const,
    transports: cred.transports || ['internal'],
  }));

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName,
    userID: isoUint8Array.fromUTF8String(userId),
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  });

  await prisma.webAuthnChallenge.upsert({
    where: { userId: userId || '' },
    create: {
      id: randomUUID(),
      userId,
      challenge: options.challenge,
      createdAt: new Date(),
    },
    update: {
      challenge: options.challenge,
      createdAt: new Date(),
    },
  });

  return options;
}

export async function verifyRegistration(userId: string, response: any) {
  const { rpID, origin } = getRelyingParty();
  const challengeDoc = await prisma.webAuthnChallenge.findFirst({ where: { userId } });

  if (!challengeDoc) {
    throw new Error('No registration challenge found');
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeDoc.challenge || '',
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    await saveCredential(userId, verification.registrationInfo.credential);
    await prisma.webAuthnChallenge.deleteMany({ where: { userId } });
  }

  return verification.verified;
}

export async function createAuthenticationOptions(userId: string) {
  const { rpID } = getRelyingParty();
  const credentials = await getCredentialsByUserId(userId);
  const allowCredentials = credentials.map((cred: any) => ({
    id: cred.credentialId,
    type: 'public-key' as const,
    transports: cred.transports || ['internal'],
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  await prisma.webAuthnChallenge.upsert({
    where: { userId: userId || '' },
    create: {
      id: randomUUID(),
      userId,
      challenge: options.challenge,
      createdAt: new Date(),
    },
    update: {
      challenge: options.challenge,
      createdAt: new Date(),
    },
  });

  return options;
}

export async function verifyAuthentication(userId: string, response: any) {
  const { rpID, origin } = getRelyingParty();
  const challengeDoc = await prisma.webAuthnChallenge.findFirst({ where: { userId } });

  if (!challengeDoc) {
    throw new Error('No authentication challenge found');
  }

  const credential = await getCredentialById(response.id);
  if (!credential) {
    throw new Error('Credential not found');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeDoc.challenge || '',
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId || '',
      publicKey: Buffer.from(credential.publicKey || '', 'base64'),
      counter: credential.counter || 0,
      transports: credential.transports as any,
    },
  });

  if (verification.verified) {
    await updateCredentialCounter(response.id, verification.authenticationInfo.newCounter);
    await prisma.webAuthnChallenge.deleteMany({ where: { userId } });
  }

  return verification.verified;
}
