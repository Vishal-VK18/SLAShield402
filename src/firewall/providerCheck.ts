const BLOCKLIST = ['0xBlocklistedProvider', 'bad_actor_api'];

export function providerCheck(providerAddress: string): { pass: boolean; reason?: string } {
  if (BLOCKLIST.includes(providerAddress)) {
    return {
      pass: false,
      reason: `Provider blocked: ${providerAddress} is on the security blocklist`,
    };
  }
  return { pass: true };
}