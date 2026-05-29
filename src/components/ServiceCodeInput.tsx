import type { ServiceMaster } from "../types/master";

interface ServiceCodeInputProps {
  id: string;
  value: string;
  services: ServiceMaster[];
  onChange: (serviceCode: string) => void;
  className?: string;
}

export function ServiceCodeInput({ id, value, services, onChange, className = "field-input" }: ServiceCodeInputProps) {
  return (
    <>
      <input
        className={className}
        list={`${id}-list`}
        value={value}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      <datalist id={`${id}-list`}>
        {services.map((service) => (
          <option key={service.id} value={service.serviceCode}>
            {service.serviceName}
          </option>
        ))}
      </datalist>
    </>
  );
}
