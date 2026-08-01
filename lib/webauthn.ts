import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import clientPromise from '@/lib/mongodb';

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
  const client = await clientPromise;
  const db = client.db('gold');
  return db.collection('webAuthnCredentials').find({ userId }).toArray();
}

export async function getCredentialById(credentialId: string) {
  const client = await clientPromise;
  const db = client.db('gold');
  return db.collection('webAuthnCredentials').findOne({ credentialId });
}

export async function saveCredential(userId: string, credential: any) {
  const client = await clientPromise;
  const db = client.db('gold');
  await db.collection('webAuthnCredentials').insertOne({
    userId,
    credentialId: credential.credentialID,
    publicKey: credential.credentialPublicKey,
    counter: credential.counter,
    transports: credential.transports || [],
    deviceName: credential.deviceName || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function updateCredentialCounter(credentialId: string, counter: number) {
  const client = await clientPromise;
  const db = client.db('gold');
  await db.collection('webAuthnCredentials').updateOne(
    { credentialId },
    { $set: { counter, updatedAt: new Date() } }
  );
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
    userID: userId,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  });

  const client = await clientPromise;
  const db = client.db('gold');
  await db.collection('webAuthnChallenges').updateOne(
    { userId },
    { $set: { challenge: options.challenge, createdAt: new Date() } },
    { upsert: true }
  );

  return options;
}

export async function verifyRegistration(userId: string, response: any) {
  const { rpID, origin } = getRelyingParty();
  const client = await clientPromise;
  const db = client.db('gold');
  const challengeDoc = await db.collection('webAuthnChallenges').findOne({ userId });

  if (!challengeDoc) {
    throw new Error('No registration challenge found');
  }

  const verification = await verifyRegistrationResponse({
    credential: response,
    expectedChallenge: challengeDoc.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });

  if (verification.verified && verification.registrationInfo) {
    await saveCredential(userId, verification.registrationInfo);
    await db.collection('webAuthnChallenges').deleteOne({ userId });
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

  const client = await clientPromise;
  const db = client.db('gold');
  await db.collection('webAuthnChallenges').updateOne(
    { userId },
    { $set: { challenge: options.challenge, createdAt: new Date() } },
    { upsert: true }
  );

  return options;
}

export async function verifyAuthentication(userId: string, response: any) {
  const { rpID, origin } = getRelyingParty();
  const client = await clientPromise;
  const db = client.db('gold');
  const challengeDoc = await db.collection('webAuthnChallenges').findOne({ userId });

  if (!challengeDoc) {
    throw new Error('No authentication challenge found');
  }

  const credential = await getCredentialById(response.id);
  if (!credential) {
    throw new Error('Credential not found');
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeDoc.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credentialId,
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports,
    },
  });

  if (verification.verified) {
    await updateCredentialCounter(response.id, verification.authenticationInfo.newCounter);
    await db.collection('webAuthnChallenges').deleteOne({ userId });
  }

  return verification.verified;
}
