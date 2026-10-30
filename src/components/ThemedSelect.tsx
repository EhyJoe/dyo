"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEventHandler, CSSProperties, ReactNode, SelectHTMLAttributes } from "react";
import "./ThemedSelect.css";

type Choice = { value: string; label: ReactNode; text: string; disabled: boolean; group?: string };
type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onChange?: ChangeEventHandler<HTMLSelectElement>;
};

function textOf(node: ReactNode): string {
  return Children.toArray(node).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (isValidElement<{ children?: ReactNode }>(child)) return textOf(child.props.children);
    return "";
  }).join("");
}

function collectChoices(children: ReactNode, inheritedDisabled = false, group?: string): Choice[] {
  const choices: Choice[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<any>(child)) return;
    if (child.type === Fragment) {
      choices.push(...collectChoices(child.props.children, inheritedDisabled, group));
    } else if (child.type === "optgroup") {
      choices.push(...collectChoices(child.props.children, inheritedDisabled || !!child.props.disabled, child.props.label));
    } else if (child.type === "option") {
      const text = textOf(child.props.children);
      choices.push({
        value: String(child.props.value ?? text),
        label: child.props.children,
        text,
        disabled: inheritedDisabled || !!child.props.disabled,
        group,
      });
    }
  });
  return choices;
}

export default function ThemedSelect({
  children, value, defaultValue, onChange, className, style, disabled, required, name, id: suppliedId,
  "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...selectProps
}: Props) {
  const id = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue ?? ""));
  const choices = useMemo(() => collectChoices(children), [children]);
  const currentValue = value === undefined ? uncontrolledValue : String(value);
  const selected = choices.find((choice) => choice.value === currentValue);
  const [active, setActive] = useState(0);
  const enabledChoices = choices.filter((choice) => !choice.disabled);
  const activeChoice = enabledChoices[active];

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  useEffect(() => {
    if (open && activeChoice) document.getElementById(`${id}-option-${choices.indexOf(activeChoice)}`)?.scrollIntoView({ block: "nearest" });
  }, [activeChoice, id, open]);

  const openAtSelected = () => {
    const selectedIndex = enabledChoices.findIndex((choice) => choice.value === currentValue);
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  };

  const choose = (choice: Choice) => {
    if (choice.disabled || !selectRef.current) return;
    const select = selectRef.current;
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
    valueSetter?.call(select, choice.value);
    if (!valueSetter) select.value = choice.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setUncontrolledValue(choice.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleNativeChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    if (value === undefined) setUncontrolledValue(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openAtSelected();
      else setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + enabledChoices.length) % enabledChoices.length);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      if (activeChoice) choose(activeChoice);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActive(Math.max(0, enabledChoices.length - 1));
    }
  };

  const buttonStyle: CSSProperties = style ?? {};
  const selectedLabel = selected?.label ?? choices.find((choice) => choice.value === "")?.label ?? choices[0]?.label ?? "Choose…";

  return (
    <div className={`dyo-select${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        id={suppliedId ?? `${id}-trigger`}
        type="button"
        className={`dyo-select-trigger ${className ?? ""}`}
        style={buttonStyle}
        role="combobox"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-activedescendant={open && activeChoice ? `${id}-option-${choices.indexOf(activeChoice)}` : undefined}
        aria-required={required || undefined}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openAtSelected()}
        onKeyDown={handleKeyDown}
      >
        <span>{selectedLabel}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 6 4.5 4.5L12.5 6" /></svg>
      </button>
      <select
        {...selectProps}
        ref={selectRef}
        id={suppliedId ? `${suppliedId}-native` : undefined}
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        required={required}
        disabled={disabled}
        onChange={handleNativeChange}
        onInvalid={(event) => {
          event.preventDefault();
          openAtSelected();
          triggerRef.current?.focus();
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="dyo-select-native"
      >{children}</select>
      {open && <div className="dyo-select-menu" id={id} role="listbox" aria-label={ariaLabel}>
        {choices.map((choice, index) => {
          const isActive = choice === activeChoice;
          const optionId = `${id}-option-${index}`;
          return <div
            id={optionId}
            key={`${choice.value}-${index}`}
            className={`dyo-select-option${choice.value === currentValue ? " is-selected" : ""}${isActive ? " is-active" : ""}${choice.disabled ? " is-disabled" : ""}`}
            role="option"
            aria-selected={choice.value === currentValue}
            aria-disabled={choice.disabled || undefined}
            onMouseEnter={() => !choice.disabled && setActive(enabledChoices.indexOf(choice))}
            onClick={() => choose(choice)}
          >{choice.group && index > 0 && choices[index - 1]?.group !== choice.group && <span className="dyo-select-group">{choice.group}</span>}{choice.label}</div>;
        })}
      </div>}
    </div>
  );
}
