import { useTranslation } from '../i18n';
import { Product } from '../utils/types';

type ProductDisambiguationModalProps = {
    variants: Product[];
    onSelect: (product: Product) => void;
    onClose: () => void;
};

export const ProductDisambiguationModal = ({ variants, onSelect, onClose }: ProductDisambiguationModalProps) => {
    const { t, language } = useTranslation();
    
    return (
        <div class="product-modal-overlay">
            <div class="product-modal">
                <button class="modal-close-button" onClick={onClose}>&times;</button>
                <h3>{t('productSelection.title')}</h3>
                <p>{t('productSelection.description')}</p>
                <div class="table-container">
                    <table class="product-modal-table">
                        <thead>
                            <tr>
                                <th>{t('productSelection.headers.fullProductId')}</th>
                                <th>{t('productSelection.headers.name')}</th>
                                <th>{t('productSelection.headers.status')}</th>
                                <th>{t('productSelection.headers.caseSize')}</th>
                                <th>{t('productSelection.headers.stockOnHand')}</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {variants.map(variant => (
                                <tr key={variant.fullProductId}>
                                    <td>{variant.fullProductId}</td>
                                    <td>{variant.name}</td>
                                    <td>{variant.status}</td>
                                    <td>{variant.caseSize}</td>
                                    <td>{variant.stockOnHand.toLocaleString(language)}</td>
                                    <td>
                                        <button 
                                            class="button-primary"
                                            onClick={() => onSelect(variant)}
                                        >
                                            {t('productSelection.selectButton')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
