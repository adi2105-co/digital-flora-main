import React from 'react';
import { useLang } from '../context/Lang.jsx';
export default function Disclaimer() { const { t } = useLang(); return <p className="disclaimer">⚠️ {t('disclaimer')}</p>; }
