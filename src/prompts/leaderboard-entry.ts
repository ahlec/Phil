import Member from '@phil/discord/Member';

class LeaderboardEntry {
  public readonly displayName: string;
  public readonly isStillInServer: boolean;

  public constructor(
    member: Member | null,
    public readonly userId: string,
    public readonly score: number
  ) {
    this.displayName = member?.displayName || userId;
    this.isStillInServer = !!member;
  }
}

export default LeaderboardEntry;
