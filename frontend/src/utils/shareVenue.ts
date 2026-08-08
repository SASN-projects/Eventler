export interface ShareableVenue {
  title: string;
  address?: string | null;
}

export const shareVenue = async (
  venue: ShareableVenue,
  onCopied: () => void,
  onFailed: () => void,
): Promise<void> => {
  const shareText = [venue.title, venue.address].filter(Boolean).join(" — ");

  if (navigator.share) {
    try {
      await navigator.share({ title: venue.title, text: shareText });
    } catch {
    }
    return;
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareText);
      onCopied();
    } catch {
      onFailed();
    }
  }
};
