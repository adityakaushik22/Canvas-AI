import { useEffect, useRef, useState } from "react";
import {SWATCHES} from '@/constants';
import { ColorSwatch, Group } from "@mantine/core";
import { Button } from "@/components/ui/button";
import axios from 'axios'
import Draggable from 'react-draggable';


interface GeneratedResult {
    expression: string;
    answer: string;
}

interface Response {
    expr: string;
    result: string;
    assign: boolean;
}

export default function Home(){
    // is drawing state to know if user is drawing
    const [isDrawing,setIsDrawing]= useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [color, setColor]= useState('rgb(255,255,255)');
    const [reset,SetReset]= useState(false);
    const [result, setResult] = useState<GeneratedResult>();
    const [dictOfVars, SetDictOfVars]= useState({});
    const [latexExpression,setLatexExpression]= useState<Array<string>>([]);
    const [latexPosition,setLatexPosition]= useState({x:10,y:200});

    useEffect(() => {
        if (reset) {
            resetCanvas();
            setLatexExpression([]);
            setResult(undefined);
            SetDictOfVars({});   
            SetReset(false);
        }
    }, [reset]);

    useEffect(() => {
        if (result) {
            renderLatexToCanvas(result.expression, result.answer);
        }
    }, [result]);

    useEffect(() => {
        if (latexExpression.length > 0 && window.MathJax) {
            setTimeout(() => {
                window.MathJax.Hub.Queue(["Typeset", window.MathJax.Hub]);
            }, 0);
        }
    }, [latexExpression]);

    useEffect(() => {
        const canvas = canvasRef.current;
    
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight - canvas.offsetTop;
                ctx.lineCap = 'round';
                ctx.lineWidth = 3;
            }

        }

        const script=document.createElement('script');
        // script.src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/config/TeX-MML-AM_CHTML.js"
        script.src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.9/MathJax.js?config=TeX-MML-AM_CHTML";
        script.async=true;
        document.body.appendChild(script);

        // script.onload=()=>{
        //     window.MathJax.Hub.Config({
        //         tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]}
        //     });
        // };

        script.onload = () => {
            window.MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$', '$'], ['\\(', '\\)']]},
            });
        };

        return () => {
            document.body.removeChild(script);
        }

    },[]); // an empty dependency array so that it doesn't run everytime state changes it will only run when we startup the application

    // const renderLatexToCanvas = (expression: string, answer: string) => {
    //     const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
    //     setLatexExpression([...latexExpression, latex]);

    //     // Clear the main canvas
    //     const canvas = canvasRef.current;
    //     if (canvas) {
    //         const ctx = canvas.getContext('2d');
    //         if (ctx) {
    //             ctx.clearRect(0, 0, canvas.width, canvas.height);
    //         }
    //     }
    // };
    
    const renderLatexToCanvas = (expression: string, answer: string) => {
        const latex = `\\(\\LARGE{${expression} = ${answer}}\\)`;
        setLatexExpression([...latexExpression, latex]);

        // Clear the main canvas
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };
    

    const sendData = async ()=>{
        const canvas=canvasRef.current;

        if (canvas){
            const response = await axios({
                method: 'post',
                url: `${import.meta.env.VITE_API_URL}/calculate`,
                data: {
                    image: canvas.toDataURL('image/png'),
                    dict_of_vars: dictOfVars,
                }
            });

            const res = await response.data;
            res.data.forEach((data: Response) => {
                if (data.assign===true) {
                    SetDictOfVars({...dictOfVars, [data.expr]: data.result});
                }
            });
            
            const ctx=canvas.getContext('2d');
            const imageData=ctx!.getImageData(0,0,canvas.width,canvas.height);
            let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    if (imageData.data[i + 3] > 0) {  // If pixel is not transparent
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            setLatexPosition({x: centerX, y: centerY});

            res.data.forEach((data: Response) => {
                setTimeout(() => {
                    setResult({expression: data.expr, answer: data.result});
                })
            },200);
            
        }

    };

    


    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        // initialised canvas
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.style.background = 'black';
            // set 2d context so that we can draw 2d diagrams on the canvs
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // will create new path and delete older stored paths
                ctx.beginPath();
                // moveto will move the cursor to wherever we want  
                ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                // set drawing state to true
                setIsDrawing(true);
            }
        }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) {
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = color;
                ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                ctx.stroke();
            }
        }
    };

    const resetCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };  

    return (
        <>
        <div className="grid grid-cols-3 gap-2">

            <Button
                onClick={()=> SetReset(true)}
                className="z-20 bg-black text-white"
                variant="default"
                color="black"
            >
                Reset
            </Button>

            <Group className="z-20">
                {SWATCHES.map((swatchcolor: string) => (
                    <ColorSwatch
                            key={swatchcolor}
                            color={swatchcolor}
                            onClick={()=> setColor(swatchcolor)}
                    />
                ))}
            </Group>

            <Button
                onClick={sendData}
                className="z-20 bg-black text-white"
                variant="default"
                color="black"
            >
                Calculate
            </Button>
        </div>

        <canvas 
         ref={canvasRef}
         id="canvas" 
         className="absolute top-0 left-0 w-full h-full"
         onMouseDown={startDrawing}
         onMouseUp={stopDrawing}
         onMouseMove={draw}
        />

        {latexExpression && latexExpression.map((latex, index) => (
                <Draggable
                    key={index}
                    defaultPosition={latexPosition}
                    onStop={(e, data) => setLatexPosition({ x: data.x, y: data.y })}
                >
                    <div className="absolute text-white">
                    <div className="latex-content">{latex}</div>
                    </div>
                </Draggable>
            ))}

        </>
        

    );
}