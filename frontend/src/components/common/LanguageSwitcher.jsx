
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={`language-switcher ${className}`}>
      <button
        onClick={() => changeLanguage('en')}
        className={`btn btn-sm ${i18n.language === 'en' ? 'btn-primary' : 'btn-outline-secondary'}`}
      >
        EN
      </button>
      <button
        onClick={() => changeLanguage('es')}
        className={`btn btn-sm ms-1 ${i18n.language === 'es' ? 'btn-primary' : 'btn-outline-secondary'}`}
      >
        ES
      </button>
    </div>
  );
};

export default LanguageSwitcher;
