"use client";

import { useState } from "react";
import { Bell, Building2, Users, Database, Shield, Mail, Globe, Check } from "lucide-react";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("company");
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState({
    companyName: "StoreTrack Inc.",
    email: "admin@storetrack.com",
    phone: "+216 12 345 678",
    address: "123 Avenue Habib Bourguiba, Tunis",
    currency: "TND",
    language: "fr",
    timezone: "Africa/Tunis",
    lowStockThreshold: 10,
    emailNotifications: true,
    systemNotifications: true,
    autoBackup: true,
    backupFrequency: "daily"
  });

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Sauvegarder dans localStorage pour la démo
    localStorage.setItem("storetrack_settings", JSON.stringify(settings));
    
    // Afficher notification de succès
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Notification de succès */}
      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in">
          <Check className="w-5 h-5" />
          <span>Paramètres sauvegardés avec succès !</span>
        </div>
      )}

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500">Gérez les paramètres de votre système</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu latéral */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
            <SettingsMenuItem 
              icon={Building2} 
              label="Informations entreprise" 
              active={activeSection === "company"}
              onClick={() => setActiveSection("company")}
            />
            <SettingsMenuItem 
              icon={Bell} 
              label="Notifications" 
              active={activeSection === "notifications"}
              onClick={() => setActiveSection("notifications")}
            />
            <SettingsMenuItem 
              icon={Database} 
              label="Sauvegardes" 
              active={activeSection === "backups"}
              onClick={() => setActiveSection("backups")}
            />
            <SettingsMenuItem 
              icon={Shield} 
              label="Sécurité" 
              active={activeSection === "security"}
              onClick={() => setActiveSection("security")}
            />
            <SettingsMenuItem 
              icon={Globe} 
              label="Localisation" 
              active={activeSection === "localization"}
              onClick={() => setActiveSection("localization")}
            />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations entreprise */}
          {activeSection === "company" && (
            <SettingsCard title="Informations de l'entreprise" icon={Building2}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Nom de l'entreprise"
                  value={settings.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                />
                <InputField
                  label="Email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                <InputField
                  label="Téléphone"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                <InputField
                  label="Devise"
                  value={settings.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                />
                <div className="md:col-span-2">
                  <InputField
                    label="Adresse"
                    value={settings.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                  />
                </div>
              </div>
            </SettingsCard>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <SettingsCard title="Notifications" icon={Bell}>
              <div className="space-y-4">
                <ToggleField
                  label="Notifications par email"
                  description="Recevoir des alertes par email"
                  checked={settings.emailNotifications}
                  onChange={(checked) => handleChange("emailNotifications", checked)}
                />
                <ToggleField
                  label="Notifications système"
                  description="Afficher les notifications dans l'application"
                  checked={settings.systemNotifications}
                  onChange={(checked) => handleChange("systemNotifications", checked)}
                />
                <InputField
                  label="Seuil d'alerte stock faible"
                  type="number"
                  value={settings.lowStockThreshold}
                  onChange={(e) => handleChange("lowStockThreshold", e.target.value)}
                />
              </div>
            </SettingsCard>
          )}

          {/* Sauvegardes */}
          {activeSection === "backups" && (
            <SettingsCard title="Sauvegardes automatiques" icon={Database}>
              <div className="space-y-4">
                <ToggleField
                  label="Sauvegardes automatiques"
                  description="Sauvegarder automatiquement la base de données"
                  checked={settings.autoBackup}
                  onChange={(checked) => handleChange("autoBackup", checked)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence
                  </label>
                  <select
                    value={settings.backupFrequency}
                    onChange={(e) => handleChange("backupFrequency", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={!settings.autoBackup}
                  >
                    <option value="hourly">Toutes les heures</option>
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Créer une sauvegarde maintenant
                </button>
              </div>
            </SettingsCard>
          )}

          {/* Sécurité */}
          {activeSection === "security" && (
            <SettingsCard title="Sécurité" icon={Shield}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Changer le mot de passe</h3>
                  <div className="space-y-3">
                    <InputField
                      label="Mot de passe actuel"
                      type="password"
                      placeholder="••••••••"
                    />
                    <InputField
                      label="Nouveau mot de passe"
                      type="password"
                      placeholder="••••••••"
                    />
                    <InputField
                      label="Confirmer le mot de passe"
                      type="password"
                      placeholder="••••••••"
                    />
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Mettre à jour le mot de passe
                    </button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <ToggleField
                    label="Authentification à deux facteurs"
                    description="Ajouter une couche de sécurité supplémentaire"
                    checked={false}
                    onChange={() => {}}
                  />
                </div>
              </div>
            </SettingsCard>
          )}

          {/* Localisation */}
          {activeSection === "localization" && (
            <SettingsCard title="Localisation et langue" icon={Globe}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Langue
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => handleChange("language", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="ar">العربية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fuseau horaire
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => handleChange("timezone", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Africa/Tunis">Afrique/Tunis (GMT+1)</option>
                    <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
                    <option value="Europe/London">Europe/Londres (GMT+0)</option>
                  </select>
                </div>
              </div>
            </SettingsCard>
          )}

          {/* Bouton sauvegarder */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composants réutilisables
function SettingsCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SettingsMenuItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        active
          ? "bg-blue-50 text-blue-600"
          : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function InputField({ label, type = "text", value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...props}
      />
    </div>
  );
}

function ToggleField({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
