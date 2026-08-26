// Em release, esconde o console do Windows atrás da janela.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    brfinder2e_lib::run()
}
