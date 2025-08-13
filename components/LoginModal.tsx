import { useState, useEffect } from 'preact/hooks';
import { useTranslation } from '../i18n';
import { RDC, UserSession } from '../utils/types';

const HQ_PASSWORD = 'OMS_HQ_2025';

type LoginModalProps = {
    onLogin: (session: UserSession) => void;
    rdcList: RDC[];
};

export const LoginModal = ({ onLogin, rdcList }: LoginModalProps) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'hq' | 'rdc'>('rdc');
    const [password, setPassword] = useState('');
    const [selectedRdcId, setSelectedRdcId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if(rdcList.length > 0) {
            setSelectedRdcId(rdcList[0].id);
        }
    }, [rdcList]);

    const handleLogin = (e: Event) => {
        e.preventDefault();
        if (mode === 'hq') {
            if (password === HQ_PASSWORD) {
                onLogin({ mode: 'hq' });
            } else {
                setError(t('loginModal.invalidPassword'));
            }
        } else { // rdc mode
            const selectedRdc = rdcList.find(r => r.id === selectedRdcId);
            if (selectedRdc) {
                onLogin({ mode: 'rdc', rdc: selectedRdc });
            }
        }
    };
    
    return (
        <div class="login-modal-overlay">
            <div class="login-modal">
                <h2>{t('loginModal.title')}</h2>
                <div class="login-options">
                    <button 
                        class={`login-option-btn ${mode === 'hq' ? 'active' : ''}`}
                        onClick={() => { setMode('hq'); setError(''); }}
                    >
                        {t('loginModal.hqButton')}
                    </button>
                    <button 
                        class={`login-option-btn ${mode === 'rdc' ? 'active' : ''}`}
                        onClick={() => { setMode('rdc'); setError(''); }}
                    >
                        {t('loginModal.rdcButton')}
                    </button>
                </div>

                <form class="login-form" onSubmit={handleLogin}>
                    {mode === 'hq' ? (
                        <div class="filter-group">
                            <label for="password">{t('loginModal.password')}</label>
                            <input 
                                id="password"
                                type="password" 
                                value={password}
                                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                                required 
                            />
                        </div>
                    ) : (
                        <div class="filter-group">
                            <label for="rdc-select">{t('loginModal.selectRdc')}</label>
                            <select 
                                id="rdc-select"
                                value={selectedRdcId} 
                                onChange={(e) => setSelectedRdcId((e.target as HTMLSelectElement).value)}
                                required
                            >
                                {rdcList.map(rdc => (
                                    <option key={rdc.id} value={rdc.id}>
                                        {rdc.id} - {rdc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <p class="login-error">{error}</p>
                    <button type="submit" class="button-primary">{t('loginModal.loginButton')}</button>
                </form>
            </div>
        </div>
    );
};
