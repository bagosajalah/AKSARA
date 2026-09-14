import clsx from 'clsx';

export default function AdminToggle({ checked, onChange, onToggle, disabled }) {
  console.log("AdminToggle - checked:", checked, "| type:", typeof checked);

  const handleToggle = () => {
    console.log("AdminToggle - toggle clicked, current checked:", checked);
    
    if (typeof onChange === 'function') {
      console.log("Menggunakan onChange, new value:", !checked);
      onChange(!checked);
    } else if (typeof onToggle === 'function') {
      console.log("Menggunakan onToggle, new value:", !checked);
      onToggle(!checked);
    } else {
      console.warn('AdminToggle: tidak ada callback yang diberikan');
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleToggle}
      className={clsx(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        checked ? 'bg-blue-600' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );
}
