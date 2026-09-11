export function getLocaleForLanguage(
  language: string,
): string {
  switch (language) {
    case 'hi':
      return 'hi-IN';

    case 'kn':
      return 'kn-IN';

    case 'ta':
      return 'ta-IN';

    case 'te':
      return 'te-IN';

    case 'ml':
      return 'ml-IN';

    case 'bn':
      return 'bn-IN';

    case 'mr':
      return 'mr-IN';

    case 'en':
    default:
      return 'en-IN';
  }
}

export function formatAppDate(
  date: string | null | undefined,
  language: string,
): string {
  if (!date) {
    return '—';
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return '—';
  }

  return parsed.toLocaleDateString(
    getLocaleForLanguage(language),
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );
}

export function formatCurrency(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value),
    )
  ) {
    return '—';
  }

  return `₹${Number(
    value,
  ).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}