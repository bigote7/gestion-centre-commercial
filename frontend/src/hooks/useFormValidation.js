import { useState } from 'react';

/**
 * Hook pour la validation de formulaires
 * @param {Object} initialValues - Valeurs initiales du formulaire
 * @param {Object} validationRules - Règles de validation par champ
 * @returns {Object} Objet contenant values, errors, touched, handlers
 */
export const useFormValidation = (initialValues, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (name, value) => {
    const rules = validationRules[name];
    if (!rules || !Array.isArray(rules)) return '';

    for (const rule of rules) {
      if (typeof rule === 'function') {
        const error = rule(value, values);
        if (error) return error;
      }
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setValues(prev => ({ ...prev, [name]: fieldValue }));
    
    if (touched[name]) {
      const error = validate(name, fieldValue);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validate(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateAll = () => {
    const newErrors = {};
    Object.keys(validationRules).forEach(name => {
      const error = validate(name, values[name]);
      if (error) newErrors[name] = error;
    });
    setErrors(newErrors);
    setTouched(
      Object.keys(validationRules).reduce(
        (acc, key) => ({ ...acc, [key]: true }), 
        {}
      )
    );
    return Object.keys(newErrors).length === 0;
  };

  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    setValues,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};

