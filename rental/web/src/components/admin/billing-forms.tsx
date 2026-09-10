"use client";

import { useActionState } from "react";
import { updateOrgSettings, updateWalletSettings } from "@/app/actions/billing";
import { emptyActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/database.types";

type Org = Tables<"org_settings"> | null;
type Wallet = Tables<"wallet_settings"> | null;

const field =
  "h-11 w-full rounded-lg border border-admin-border bg-admin-surface px-3 text-sm text-admin-text placeholder:text-admin-text-muted";
const label = "mb-1 block text-[13px] font-medium text-admin-text";

export function BillingForms({ org, wallet }: { org: Org; wallet: Wallet }) {
  const [orgState, orgAction, orgPending] = useActionState(updateOrgSettings, emptyActionState);
  const [walletState, walletAction, walletPending] = useActionState(
    updateWalletSettings,
    emptyActionState,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-admin-border bg-admin-surface p-4 sm:p-5">
        <h2 className="mb-4 font-heading text-[15px] font-bold text-admin-text">بيانات المنشأة</h2>
        <form action={orgAction} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="seller_name">اسم المنشأة</label>
            <input id="seller_name" name="seller_name" className={field} defaultValue={org?.seller_name ?? ""} required />
          </div>
          <div>
            <label className={label} htmlFor="vat_number">الرقم الضريبي</label>
            <input
              id="vat_number"
              name="vat_number"
              inputMode="numeric"
              placeholder="٣xxxxxxxxxxxx٣"
              className={field}
              defaultValue={org?.vat_number ?? ""}
            />
          </div>
          <div>
            <label className={label} htmlFor="cr_number">السجل التجاري</label>
            <input id="cr_number" name="cr_number" className={field} defaultValue={org?.cr_number ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="address">العنوان</label>
            <input id="address" name="address" className={field} defaultValue={org?.address ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="city">المدينة</label>
            <input id="city" name="city" className={field} defaultValue={org?.city ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="postal_code">الرمز البريدي</label>
            <input id="postal_code" name="postal_code" className={field} defaultValue={org?.postal_code ?? ""} />
          </div>
          <div>
            <label className={label} htmlFor="phone">الهاتف</label>
            <input id="phone" name="phone" className={field} defaultValue={org?.phone ?? ""} />
          </div>

          {orgState.error ? (
            <p className="text-[13px] text-admin-danger sm:col-span-2">{orgState.error}</p>
          ) : orgState.success ? (
            <p className="text-[13px] text-admin-primary sm:col-span-2">حُفظت البيانات.</p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={orgPending}>
              {orgPending ? "جارٍ الحفظ…" : "حفظ بيانات المنشأة"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="border-admin-border bg-admin-surface p-4 sm:p-5">
        <h2 className="mb-1 font-heading text-[15px] font-bold text-admin-text">
          المحفظة والدعوة
        </h2>
        <p className="mb-4 text-[12px] leading-relaxed text-admin-text-muted">
          تسري فورًا على التطبيق. رصيد الترحيب يُمنح مرة واحدة لكل حساب، ومكافأة الدعوة
          مرة واحدة لكل مدعوّ.
        </p>
        <form action={walletAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="welcome_bonus">رصيد الترحيب (ر.س)</label>
            <input id="welcome_bonus" name="welcome_bonus" type="number" min="0" step="1" className={field} defaultValue={Number(wallet?.welcome_bonus ?? 50)} />
          </div>
          <div>
            <label className={label} htmlFor="referral_bonus">مكافأة الداعي (ر.س)</label>
            <input id="referral_bonus" name="referral_bonus" type="number" min="0" step="1" className={field} defaultValue={Number(wallet?.referral_bonus ?? 20)} />
          </div>
          <div>
            <label className={label} htmlFor="min_booking_total_to_redeem">
              أقل إجمالي حجز لاستخدام الرصيد (ر.س)
            </label>
            <input id="min_booking_total_to_redeem" name="min_booking_total_to_redeem" type="number" min="0" step="1" className={field} defaultValue={Number(wallet?.min_booking_total_to_redeem ?? 0)} />
          </div>
          <div>
            <label className={label} htmlFor="max_redeem_percent">
              أقصى نسبة تُغطى من الرصيد (٪)
            </label>
            <input id="max_redeem_percent" name="max_redeem_percent" type="number" min="0" max="100" step="1" className={field} defaultValue={Number(wallet?.max_redeem_percent ?? 100)} />
          </div>

          <Toggle name="welcome_enabled" label="تفعيل رصيد الترحيب" defaultChecked={wallet?.welcome_enabled ?? true} />
          <Toggle name="referral_enabled" label="تفعيل الدعوة" defaultChecked={wallet?.referral_enabled ?? true} />
          <Toggle
            name="require_phone_for_welcome"
            label="اشتراط رقم جوال موثّق"
            hint="بدونه يصبح رصيد الترحيب مستحقًا مع كل إعادة تثبيت للتطبيق."
            defaultChecked={wallet?.require_phone_for_welcome ?? true}
          />

          {walletState.error ? (
            <p className="text-[13px] text-admin-danger sm:col-span-2">{walletState.error}</p>
          ) : walletState.success ? (
            <p className="text-[13px] text-admin-primary sm:col-span-2">حُفظت الإعدادات.</p>
          ) : null}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={walletPending}>
              {walletPending ? "جارٍ الحفظ…" : "حفظ إعدادات المحفظة"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Toggle({
  name,
  label: text,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3 sm:col-span-2">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 accent-admin-primary"
      />
      <span>
        <span className="block text-[13px] font-medium text-admin-text">{text}</span>
        {hint ? (
          <span className="block text-[12px] leading-relaxed text-admin-text-muted">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}
