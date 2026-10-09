'use client';

import {useCallback} from 'react';
import {editableText} from '@/lib/content-safety';
import {useSiteContent} from './SiteContentProvider';

/** Account copy is editable; customer data, destinations, and account actions remain authoritative. */
export function useAccountText() {
  const content = useSiteContent();
  return useCallback((key: string, fallback: string) => editableText(content, `account-${key}`, fallback), [content]);
}
