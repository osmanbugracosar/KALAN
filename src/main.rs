// Windows'ta sürüm modunda konsol penceresini gizle
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kalan_lib::run()
}
