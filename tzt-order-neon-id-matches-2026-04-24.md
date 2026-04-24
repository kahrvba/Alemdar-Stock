# TUOZHANTENG Order Neon ID Matches

Source PDF: `/Users/ahmed/Downloads/View Order - TUOZHANTENG HK co.,LTD3.pdf`
Neon project: `alemdar-production` (`lucky-cake-97066376`)
Tables checked: `public.arduino`, `public.mainled`
Rule: only saved matches with confidence `>= 96%`. No ID is assigned for lower-confidence or ambiguous matches.

## Matched IDs

| # | TZT goods | PDF product / option | Neon table | Neon id | Neon product name | Confidence |
|---:|---:|---|---|---:|---|---:|
| 1 | 7578 | DRV8825 stepper motor driver | arduino | 35 | DRV8825 Stepper Motor Driver Circuit | 99 |
| 3 | 8367 | Nema17 17HS4401S step motor | arduino | 243 | Nema 17 HS4401 Step Motor | 99 |
| 4 | 6158 | TZT ESP32 development board, ESP32S-CP2102-TYPEC | arduino | 365 | TZT ESP32 Development Board | 98 |
| 5 | 4678 | HC-SR04 ultrasonic distance sensor | arduino | 11 | HC-SR04 Ultra Sonic Sensor | 99 |
| 6 | 4653 | XY joystick module | arduino | 86 | Arduino XY Joystick Module | 99 |
| 7 | 6149 | NodeMcu CH340/CP2102 Type-C ESP8266 board | arduino | 206 | V3 NodeMcu Ch-340 Wifi Development Module (ESP8266) | 97 |
| 8 | 4677 | 3S 20A Li-ion lithium battery BMS | arduino | 233 | BMS 3S 20A | 99 |
| 10 | 4873 | NRF24L01+PA+LNA wireless module | arduino | 176 | nRF24L01+ PA 2.4GHz Wireless Module | 98 |
| 12 | 5675 | XL4015 5A adjustable step-down module | arduino | 85 | XL4015 5A Adjuastable DC/DC Voltage Stepper (Step Down) | 98 |
| 15 | 5222 | DC 6V-28V 3A PWM motor speed controller | arduino | 371 | DC 6V ~ 28V 3A Motor Speed Control Circuit | 98 |
| 16 | 5022 | L298N motor driver | arduino | 142 | L298 DC ve Step Motor Surucu Modulu | 99 |
| 17 | 8418 | ESP32-WROOM-32U / MICRO ESP32U CP2102 | arduino | 215 | ESP32-WROOM-32U Wifi Bluetooth Development Module | 99 |
| 18 | 8142 | MG90S servo motor | arduino | 283 | MG90S Servo Motor | 99 |
| 19 | 8142 | MG996R servo motor | arduino | 58 | MG996 Metal Servo Motor | 97 |
| 20 | 8139 | 2-channel 5V relay board | arduino | 300 | 5V 2 Channel Relay Board | 99 |
| 21 | 8139 | 4-channel 12V relay module | arduino | 362 | 4 Channel 12V Relay Module | 99 |
| 22 | 8091 | L9110 fan motor module | arduino | 102 | L9110 Arduino Fan MODULE | 99 |
| 23 | 8089 | L293D motor shield | arduino | 91 | ARDUINO MOTOR SHIELD-L293D | 98 |
| 24 | 8055 | LM2596S power module with LED voltmeter display | arduino | 110 | Step Down LM2596 DC-DC Converter + Display | 99 |
| 30 | 7880 | 40Pin 1x40 male breakable pin header strip | arduino | 90 | 1x40 Male/Female Gold Plated Breakable Pin Header Straight Connector | 97 |
| 31 | 7828 | DHT11 module | arduino | 96 | DHT11 ARDUINO TEMPERATURE AND HUMIDITY SENSOR | 99 |
| 32 | 7828 | DHT22 module black | arduino | 187 | DHT22 Temperature Sensor | 99 |
| 41 | 7545 | 4 x 18650 battery case | arduino | 121 | 18650 Lithium ion Battery socket - 4 Channel | 97 |
| 42 | 6381 | Active buzzer module | arduino | 165 | Arduino Buzzer Board / Module | 99 |
| 43 | 6374 | MT3608 Type-C boost module | arduino | 207 | MT3608 2A Type-C USB Amplifier DC-DC Stepping Power Module | 99 |
| 44 | 6352 | HC-06 Bluetooth module | arduino | 46 | HC06 4 Pin Arduino Bluetooth Module | 99 |
| 48 | 5612 | GY-906 MLX90614 contactless temperature sensor | arduino | 275 | Arduino Infrared Thermometer Module (MLX90614ESF-BCC) | 99 |
| 51 | 5321 | LCD keypad shield | arduino | 272 | Arduino LCD Keypad Shield - 2x16 LCD Display Module with Arduino Keys | 99 |
| 52 | 5108 | DC12V submersible water pump | arduino | 316 | DC-12V Submersible Water Pump | 99 |
| 57 | 4866 | Mini MP3 player module | arduino | 33 | Arduino MP3 Player - MP3 Module - Sound Module - Mini SD Card Input | 99 |
| 58 | 4791 | TCRT5000 infrared sensor | arduino | 70 | TCRT5000 Infrared Reflection Sensor Module - Optical Sensor Board | 99 |
| 59 | 4710 | PCA9685 16-channel PWM servo driver | arduino | 293 | PCA9685 16 Channel 12 Bit PWM | 99 |
| 61 | 4658 | Standard voltage sensor module | arduino | 262 | Arduino 25V Voltage Sensor Module | 98 |
| 62 | 6251 | CP2102 USB UART converter | arduino | 143 | CP2102 USB UART CONVERTER | 99 |
| 63 | 6427 | USB to RS485 CH340G converter | arduino | 323 | USB to RS485 CH340G | 99 |

## Skipped: Below 96% Or Ambiguous

| # | TZT goods | PDF product / option | Reason |
|---:|---:|---|---|
| 2 | 6204 | Raspberry Pi 4 night vision fisheye camera 5MP OV5647, 160 degrees | DB only had generic Raspberry camera/module rows, not exact 5MP OV5647 fisheye variant. |
| 9 | 5621 | XL4005 / DSN5000 5A step-down module | No exact XL4005 row found. |
| 11 | 4912 | IR infrared obstacle avoidance sensor | No exact obstacle-avoidance row found. |
| 13 | 5704 | 400 tie-points solderless breadboard | DB has generic breadboards, not exact 400 tie-points. |
| 14 | 5619 | LM2596 DC-DC step-down module | Duplicate/generic LM2596 rows make exact ID ambiguous. |
| 25-29 | 7919 | Female header socket 40Pin / 20Pin / 8Pin / 6Pin / 4Pin | DB has generic pin header rows, not exact female header variants. |
| 33-36 | 7762 / 7764 | KF301 terminal blocks blue/black/green | No exact KF301 terminal block variants found. |
| 37-40 | 7549 | Dupont jumper wire kits 10/15/20/30cm | DB has generic jumper cable set, not exact 120PCS length variants. |
| 45 | 5725 | 12x18cm prototype PCB | No exact 12x18cm PCB row found. |
| 46 | 5713 | 5x10cm prototype PCB | No exact 5x10cm PCB row found. |
| 47 | 5706 | 9x15cm prototype PCB | No exact 9x15cm PCB row found. |
| 49 | 5588 | MAX9814 microphone AGC amplifier | No exact MAX9814 row found. |
| 50 | 5386 | Ceramic piezo vibration sensor | No exact piezo vibration sensor row found. |
| 53-54 | 4887 | AD8232 ECG sensor module | DB has generic ECG sensor kit only; no AD8232-specific row. |
| 55-56 | 7901 | SYB-170 mini breadboard blue/black | DB has generic mini breadboard only, not SYB-170 color variants. |
| 60 | 8195 | HC-SR501 PIR motion sensor | DB has generic PIR motion sensor only, not HC-SR501-specific row. |

## Notes

- `public.arduinoproducts` was not present; Neon has `public.arduino`.
- `public.mainled` was checked. No `mainled` product reached the 96% threshold for this PDF.
