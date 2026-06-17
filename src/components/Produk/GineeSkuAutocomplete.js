import React from 'react';
import AsyncSelect from 'react-select/async';
import API from '../../api';

const GineeSkuAutocomplete = ({ value, onChange, onSelectProduct, disabled, autoFocus, hideLabel, customLabel, customPlaceholder }) => {
  const loadOptions = async (inputValue) => {
    if (!inputValue) return [];
    try {
      const response = await API.get(`/ginee/products/search?q=${inputValue}`);
      return response.data.map(item => ({
        label: item.sku,
        value: item.sku,
        originalData: item
      }));
    } catch (error) {
      console.error("Error fetching Ginee SKUs", error);
      return [];
    }
  };

  const handleChange = (selectedOption) => {
    onChange({
      target: {
        name: 'sku_name',
        value: selectedOption ? selectedOption.value : ''
      }
    });

    if (selectedOption && onSelectProduct) {
      onSelectProduct(selectedOption.originalData);
    }
  };

  const selectComponent = (
    <AsyncSelect
      cacheOptions
      defaultOptions={false}
      loadOptions={loadOptions}
      onChange={handleChange}
      isDisabled={disabled}
      autoFocus={autoFocus}
      placeholder={customPlaceholder || "Ketik SKU..."}
      value={value ? { label: value, value: value } : null}
      styles={{
        control: (base) => ({
          ...base,
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          minHeight: '36px',
          fontSize: '13px',
          boxShadow: 'none',
          '&:hover': {
            borderColor: '#cbd5e1'
          }
        }),
        input: (base) => ({
          ...base,
          margin: '0',
          padding: '0'
        }),
        placeholder: (base) => ({
          ...base,
          color: '#94a3b8',
          fontSize: '13px'
        }),
        singleValue: (base) => ({
          ...base,
          fontSize: '13px',
          color: '#334155'
        }),
        option: (base, state) => ({
          ...base,
          fontSize: '13px',
          backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
          color: '#334155',
          cursor: 'pointer',
          padding: '8px 12px'
        })
      }}
    />
  );

  if (hideLabel) {
    return selectComponent;
  }

  return (
    <label className="product-list-field">
      <span style={{ color: customLabel === "Tarik Semua Varian Ginee" ? "#4f46e5" : "inherit", fontWeight: customLabel === "Tarik Semua Varian Ginee" ? "bold" : "normal" }}>
        {customLabel || "SKU Name (Ginee Sync) *"}
      </span>
      {selectComponent}
    </label>
  );
};

export default GineeSkuAutocomplete;
