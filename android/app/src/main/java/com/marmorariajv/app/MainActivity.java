package com.marmorariajv.app;

import android.app.AlertDialog;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onBackPressed() {
        WebView webView = this.getBridge() != null ? this.getBridge().getWebView() : null;

        // Dentro do app: volta na navegação web normalmente
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }

        // Na tela inicial: confirma antes de sair
        new AlertDialog.Builder(this)
            .setTitle("Sair do app")
            .setMessage("Deseja realmente sair?")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Sair", (dialog, which) -> finish())
            .show();
    }
}
