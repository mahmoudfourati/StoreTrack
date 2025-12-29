"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanBarcode, X, Search, Package } from "lucide-react";
import api from "@/lib/axios";
import { toast } from "sonner";

export default function BarcodeScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [manualSku, setManualSku] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scanner]);

  const startScanner = () => {
    // Ensure element exists before initializing
    const readerElement = document.getElementById("reader");
    if (!readerElement) {
      toast.error("Erreur: Élément scanner introuvable");
      return;
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [0, 1, 2] // QR Code, Code128, EAN
      },
      false
    );

    html5QrcodeScanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        html5QrcodeScanner.clear();
        setScanning(false);
      },
      (errorMessage) => {
        // Ignore erreurs de scan continues
      }
    );

    setScanner(html5QrcodeScanner);
    setScanning(true);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setScanning(false);
  };

  const onScanSuccess = async (sku) => {
    toast.success(`Code scanné: ${sku}`);
    await searchArticleBySku(sku);
  };

  const searchArticleBySku = async (sku) => {
    setLoading(true);
    try {
      const response = await api.get(`/articles`);
      const article = response.data.find(a => a.sku === sku);
      
      if (article) {
        setSearchResult(article);
        toast.success("Article trouvé !");
      } else {
        setSearchResult(null);
        toast.error("Aucun article trouvé avec ce code");
      }
    } catch (error) {
      console.error("Erreur recherche article:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualSku.trim()) {
      searchArticleBySku(manualSku.trim());
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Scanner Code-Barres</h1>
        <p className="text-gray-500 mt-1">Recherche rapide d&apos;articles par code-barres</p>
      </div>

      {/* Scanner Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scanning ? (
            <Button onClick={startScanner} className="w-full gap-2">
              <ScanBarcode className="w-5 h-5" />
              Démarrer le scanner
            </Button>
          ) : (
            <div className="space-y-4">
              <div id="reader" className="w-full"></div>
              <Button onClick={stopScanner} variant="destructive" className="w-full gap-2">
                <X className="w-5 h-5" />
                Arrêter le scanner
              </Button>
            </div>
          )}

          {/* Recherche manuelle */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-2">Ou entrer le code manuellement:</p>
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <Input
                value={manualSku}
                onChange={(e) => setManualSku(e.target.value)}
                placeholder="Entrer le SKU..."
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      {/* Résultat */}
      {searchResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Article Trouvé
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {searchResult.image_url && (
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                  <Image 
                    src={searchResult.image_url} 
                    alt={searchResult.name}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{searchResult.name}</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">SKU:</span> {searchResult.sku}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Catégorie:</span> {searchResult.category}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Prix:</span> {Number(searchResult.price).toFixed(2)} TND
                  </p>
                  <p className={`font-semibold ${searchResult.stock <= searchResult.min_stock ? 'text-red-600' : 'text-green-600'}`}>
                    <span className="font-medium text-gray-600">Stock:</span> {searchResult.stock} unités
                  </p>
                  {searchResult.lot_number && (
                    <p className="text-gray-600">
                      <span className="font-medium">Lot:</span> {searchResult.lot_number}
                    </p>
                  )}
                  {searchResult.expiration_date && (
                    <p className="text-gray-600">
                      <span className="font-medium">Expiration:</span> {new Date(searchResult.expiration_date).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Code-barres de l'article */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Code-barres:</p>
              <div className="bg-white p-4 border rounded-lg flex justify-center">
                <Image 
                  src={`http://localhost:5000/api/articles/${searchResult.id}/barcode`}
                  alt="Code-barres"
                  width={300}
                  height={100}
                  unoptimized
                  className="max-w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
