/**
 * 结果页展示文案统一（薪资等）
 */
(function (global) {
  const SALARY_LABEL = '薪资范围（参考）';

  function formatSalaryValue(value) {
    const v = value == null || value === '' || value === '--' ? '—' : String(value);
    return v;
  }

  /** 单行：薪资范围（参考）：20-60万/年 */
  function formatSalaryLine(value) {
    return `${SALARY_LABEL}：${formatSalaryValue(value)}`;
  }

  /** 分离标签与数值（用于 meta-box 布局） */
  function salaryMetaLabel() {
    return SALARY_LABEL;
  }

  global.FormatLabels = {
    SALARY_LABEL,
    formatSalaryValue,
    formatSalaryLine,
    salaryMetaLabel
  };
})(typeof window !== 'undefined' ? window : global);
